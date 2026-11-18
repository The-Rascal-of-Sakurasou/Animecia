#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKDIR="$(mktemp -d "${RUNNER_TEMP:-/tmp}/anixia-snapshot-check.XXXXXX")"

cleanup() {
  if [[ -d "$WORKDIR" ]]; then
    (cd "$WORKDIR" && supabase stop --no-backup >/dev/null 2>&1) || true
    rm -rf "$WORKDIR"
  fi
}
trap cleanup EXIT

echo "Creating a temporary, unlinked Supabase project at $WORKDIR"
cd "$WORKDIR"
supabase init --yes
if grep -q '^\[inbucket\]' supabase/config.toml; then
  echo "Unsupported legacy [inbucket] config section detected." >&2
  exit 1
fi
supabase start

if ! command -v psql >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y postgresql-client
fi
eval "$(supabase status -o env)"
: "${DB_URL:?Supabase did not provide a local DB_URL}"

for file in \
  01_tables_and_constraints.sql \
  02_indexes_and_rls.sql \
  04_functions_and_triggers.sql \
  03_policies.sql \
  05_grants.sql \
  06_comments.sql \
  07_default_privileges.sql
do
  echo "::group::Apply $file to the disposable local database"
  if [[ "$file" == "07_default_privileges.sql" ]]; then
    # Supabase reserves supabase_admin memberships; replay postgres defaults and
    # structurally validate the admin-owned section rather than impersonating it.
    awk '/^SET ROLE supabase_admin;/{exit} {print}' "$ROOT/supabase/schema-snapshot/$file" > "$WORKDIR/07-postgres-defaults.sql"
    psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$WORKDIR/07-postgres-defaults.sql"
    grep -q '^SET ROLE supabase_admin;' "$ROOT/supabase/schema-snapshot/$file"
    grep -q '^ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin ' "$ROOT/supabase/schema-snapshot/$file"
    grep -q '^RESET ROLE;' "$ROOT/supabase/schema-snapshot/$file"
    echo "Validated reserved supabase_admin defaults structurally (no reserved membership grant attempted)"
  else
    psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/schema-snapshot/$file"
  fi
  if [[ "$file" == "04_functions_and_triggers.sql" ]]; then
    echo "Checking both public anime-search overloads are present"
    psql "$DB_URL" -v ON_ERROR_STOP=1 -c "
      DO \$\$
      BEGIN
        IF to_regprocedure('public.search_public_anime(text,uuid,integer,text,public.anime_format,uuid,text,integer,integer,uuid[],text,text)') IS NULL THEN
          RAISE EXCEPTION '12-argument search_public_anime overload is missing';
        END IF;
        IF to_regprocedure('public.search_public_anime(text,uuid,integer,text,public.anime_format,uuid,text,integer,integer)') IS NULL THEN
          RAISE EXCEPTION '9-argument search_public_anime overload is missing';
        END IF;
      END
      \$\$;"
  fi
  echo "::endgroup::"
done

cat > "$WORKDIR/assert-snapshot.sql" <<'SQL'
DO $$
DECLARE
  actual_tables integer;
  actual_constraints integer;
  actual_rls_tables integer;
  actual_policies integer;
  actual_functions integer;
  actual_triggers integer;
  actual_extensions integer;
BEGIN
  SELECT count(*) INTO actual_tables FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private') AND c.relkind IN ('r','p');
  SELECT count(*) INTO actual_constraints FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname IN ('public','private');
  SELECT count(*) INTO actual_rls_tables FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private') AND c.relkind IN ('r','p') AND c.relrowsecurity;
  SELECT count(*) INTO actual_policies FROM pg_policies WHERE schemaname IN ('public','private');
  SELECT count(*) INTO actual_functions FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private') AND p.prokind='f';
  SELECT count(*) INTO actual_triggers FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private','auth') AND NOT t.tgisinternal;
  SELECT count(*) INTO actual_extensions FROM pg_extension WHERE extname IN ('pg_cron','pg_net','pgcrypto','uuid-ossp');
  RAISE NOTICE 'tables=%, constraints=%, rls_tables=%, policies=%, functions=%, triggers=%, required_extensions=%', actual_tables,actual_constraints,actual_rls_tables,actual_policies,actual_functions,actual_triggers,actual_extensions;
  IF actual_tables<>47 THEN RAISE EXCEPTION 'Expected 47 application tables, found %',actual_tables; END IF;
  IF actual_constraints<>172 THEN RAISE EXCEPTION 'Expected 172 constraints, found %',actual_constraints; END IF;
  IF actual_rls_tables<>47 THEN RAISE EXCEPTION 'Expected RLS on all 47 application tables, found %',actual_rls_tables; END IF;
  IF actual_policies<>69 THEN RAISE EXCEPTION 'Expected 69 RLS policies, found %',actual_policies; END IF;
  IF actual_functions<20 THEN RAISE EXCEPTION 'Expected at least 20 application functions, found %',actual_functions; END IF;
  IF actual_triggers<11 THEN RAISE EXCEPTION 'Expected at least 11 application triggers, found %',actual_triggers; END IF;
  IF actual_extensions<>4 THEN RAISE EXCEPTION 'Expected 4 required extensions, found %',actual_extensions; END IF;
END
$$;
SQL
echo "::group::Verify reconstructed schema"
psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$WORKDIR/assert-snapshot.sql"
echo "::endgroup::"
echo "Schema snapshot replay and catalog assertions passed."
