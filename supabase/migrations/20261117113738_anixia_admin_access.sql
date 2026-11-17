CREATE TABLE IF NOT EXISTS private.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.admin_users ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.is_anixia_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT EXISTS (SELECT 1 FROM private.admin_users au WHERE au.user_id = (SELECT auth.uid()));
$function$;
REVOKE ALL ON FUNCTION public.is_anixia_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_anixia_admin() TO authenticated;
