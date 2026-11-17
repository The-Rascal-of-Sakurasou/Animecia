-- ANIXIA Wikidata catalog synchronization state, private cron-token hash and schedule.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.catalog_sync_secrets (
  id smallint primary key default 1 check (id = 1),
  secret_hash text not null,
  updated_at timestamptz not null default now()
);
alter table public.catalog_sync_secrets enable row level security;
revoke all on public.catalog_sync_secrets from anon, authenticated;
grant all on public.catalog_sync_secrets to service_role;

create table if not exists public.catalog_sync_state (
  source text primary key,
  next_offset integer not null default 0 check (next_offset >= 0),
  last_success_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.catalog_sync_state enable row level security;
revoke all on public.catalog_sync_state from anon, authenticated;
grant all on public.catalog_sync_state to service_role;

insert into public.catalog_sync_state (source, next_offset)
values ('wikidata', 0)
on conflict (source) do nothing;

-- Generate the private token in Postgres. Only its SHA-256 hash is stored in
-- the application table; the plaintext remains inside Supabase Vault.
do $$
declare
  sync_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  perform vault.create_secret(
    sync_token,
    'anixia_wikidata_sync_token',
    'Private token for scheduled ANIXIA Wikidata catalog synchronization'
  );
  insert into public.catalog_sync_secrets (id, secret_hash)
  values (1, encode(extensions.digest(sync_token, 'sha256'), 'hex'))
  on conflict (id) do update
    set secret_hash = excluded.secret_hash, updated_at = now();
end $$;

select cron.schedule(
  'anixia-wikidata-catalog-sync',
  '30 2 * * *',
  $job$
  select net.http_post(
    url := 'https://trvnxggqzlhqdhoyiliy.supabase.co/functions/v1/sync-wikidata-catalog',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-anixia-cron-token',
      (select decrypted_secret from vault.decrypted_secrets where name = 'anixia_wikidata_sync_token' limit 1)
    ),
    body := jsonb_build_object('mode', 'sync', 'source', 'cron', 'limit', 50),
    timeout_milliseconds := 60000
  ) as request_id;
  $job$
);
