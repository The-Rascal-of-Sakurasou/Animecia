-- Respect per-profile visibility settings when exposing watch history, ratings, favorites, and reviews.

DROP POLICY IF EXISTS "Public favorites are readable" ON public.favorites;
CREATE POLICY "Public favorites are readable" ON public.favorites
 FOR SELECT TO anon,authenticated
 USING(EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=user_id AND p.is_public=true AND p.show_favorites=true));
GRANT SELECT ON public.favorites TO anon,authenticated;

DROP POLICY IF EXISTS "Public watch entries are readable" ON public.watch_entries;
CREATE POLICY "Public watch entries are readable" ON public.watch_entries
 FOR SELECT TO anon,authenticated
 USING(EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=user_id AND p.is_public=true AND p.show_watch_status=true));
GRANT SELECT ON public.watch_entries TO anon,authenticated;

DROP POLICY IF EXISTS "Public ratings are readable" ON public.ratings;
CREATE POLICY "Public ratings are readable" ON public.ratings
 FOR SELECT TO anon,authenticated
 USING(EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=user_id AND p.is_public=true AND p.show_ratings=true));
GRANT SELECT ON public.ratings TO anon,authenticated;

DROP POLICY IF EXISTS "Published reviews are readable" ON public.reviews;
CREATE POLICY "Published reviews are readable" ON public.reviews
 FOR SELECT TO anon,authenticated
 USING(is_published=true AND EXISTS(
  SELECT 1 FROM public.profiles p WHERE p.id=user_id AND p.is_public=true AND p.show_reviews=true
 ));
