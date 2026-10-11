-- Wrap per-request auth.uid() calls in scalar subqueries so PostgreSQL can
-- evaluate them once per statement instead of once per row. Policy predicates
-- and role/action semantics are otherwise preserved.
DO $migration$
DECLARE
  p record;
  v_roles text;
  v_qual text;
  v_check text;
  v_sql text;
BEGIN
  CREATE TEMP TABLE _animecia_policy_rewrites ON COMMIT DROP AS
  SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (
      (coalesce(qual, '') ~* 'auth\.uid\(\)' AND coalesce(qual, '') !~* 'select\s+auth\.uid\(\)')
      OR
      (coalesce(with_check, '') ~* 'auth\.uid\(\)' AND coalesce(with_check, '') !~* 'select\s+auth\.uid\(\)')
    );

  FOR p IN SELECT * FROM _animecia_policy_rewrites LOOP
    SELECT string_agg(
      CASE WHEN lower(role_name) = 'public' THEN 'PUBLIC' ELSE quote_ident(role_name) END,
      ', ' ORDER BY ord
    )
    INTO v_roles
    FROM unnest(p.roles) WITH ORDINALITY AS role_list(role_name, ord);

    v_qual := p.qual;
    IF v_qual IS NOT NULL
       AND v_qual ~* 'auth\.uid\(\)'
       AND v_qual !~* 'select\s+auth\.uid\(\)' THEN
      v_qual := regexp_replace(v_qual, 'auth\.uid\(\)', '(select auth.uid())', 'gi');
    END IF;

    v_check := p.with_check;
    IF v_check IS NOT NULL
       AND v_check ~* 'auth\.uid\(\)'
       AND v_check !~* 'select\s+auth\.uid\(\)' THEN
      v_check := regexp_replace(v_check, 'auth\.uid\(\)', '(select auth.uid())', 'gi');
    END IF;

    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);

    v_sql := format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      p.policyname, p.schemaname, p.tablename, p.permissive, p.cmd, coalesce(v_roles, 'PUBLIC')
    );
    IF v_qual IS NOT NULL THEN
      v_sql := v_sql || format(' USING (%s)', v_qual);
    END IF;
    IF v_check IS NOT NULL THEN
      v_sql := v_sql || format(' WITH CHECK (%s)', v_check);
    END IF;
    EXECUTE v_sql;
  END LOOP;
END;
$migration$;
