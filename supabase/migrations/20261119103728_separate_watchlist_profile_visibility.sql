-- Keep planned anime and watch history visibility independent.
DROP POLICY IF EXISTS "Public watch entries are readable" ON public.watch_entries;
CREATE POLICY "Public watch entries are readable" ON public.watch_entries
FOR SELECT TO anon,authenticated
USING(EXISTS(
 SELECT 1 FROM public.profiles p
 WHERE p.id=public.watch_entries.user_id AND p.is_public=true
 AND (
  (public.watch_entries.status::text='plan_to_watch' AND p.show_anime_follows=true)
  OR (public.watch_entries.status::text<>'plan_to_watch' AND p.show_watch_status=true)
 )
));
