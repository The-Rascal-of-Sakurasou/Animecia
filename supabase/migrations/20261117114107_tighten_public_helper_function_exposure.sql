CREATE OR REPLACE FUNCTION private.is_published_anime(p_anime_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.anime a WHERE a.id = p_anime_id AND a.is_published = true);
$function$;
REVOKE ALL ON FUNCTION private.is_published_anime(uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_published_anime(uuid) TO anon, authenticated;
DROP POLICY IF EXISTS "Anime characters are readable" ON public.anime_characters;
CREATE POLICY "Anime characters are readable" ON public.anime_characters FOR SELECT TO anon, authenticated USING (private.is_published_anime(anime_id));
DROP POLICY IF EXISTS "Anime genres are readable" ON public.anime_genres;
CREATE POLICY "Anime genres are readable" ON public.anime_genres FOR SELECT TO anon, authenticated USING (private.is_published_anime(anime_id));
DROP POLICY IF EXISTS "Anime staff are readable" ON public.anime_staff;
CREATE POLICY "Anime staff are readable" ON public.anime_staff FOR SELECT TO anon, authenticated USING (private.is_published_anime(anime_id));
DROP POLICY IF EXISTS "Anime tags are readable" ON public.anime_tags;
CREATE POLICY "Anime tags are readable" ON public.anime_tags FOR SELECT TO anon, authenticated USING (private.is_published_anime(anime_id));
DROP FUNCTION IF EXISTS public.is_published_anime(uuid);
DROP FUNCTION IF EXISTS public.get_anime_rating_summary();
CREATE OR REPLACE FUNCTION private.is_anixia_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT EXISTS (SELECT 1 FROM private.admin_users au WHERE au.user_id = (SELECT auth.uid()));
$function$;
REVOKE ALL ON FUNCTION private.is_anixia_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_anixia_admin() TO authenticated;
CREATE OR REPLACE FUNCTION public.is_anixia_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $function$
  SELECT private.is_anixia_admin();
$function$;
REVOKE ALL ON FUNCTION public.is_anixia_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_anixia_admin() TO authenticated;
