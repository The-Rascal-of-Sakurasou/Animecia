-- Remove permissive legacy advertisement policies that allowed any signed-in
-- user to write ads or read inactive ads. Keep the active-ad public read policy
-- and the existing admin-only write policies.
DROP POLICY IF EXISTS "Authenticated users can delete advertisements" ON public.advertisements;
DROP POLICY IF EXISTS advertisements_authenticated_delete ON public.advertisements;
DROP POLICY IF EXISTS "Authenticated users can insert advertisements" ON public.advertisements;
DROP POLICY IF EXISTS advertisements_authenticated_insert ON public.advertisements;
DROP POLICY IF EXISTS "Authenticated users can update advertisements" ON public.advertisements;
DROP POLICY IF EXISTS advertisements_authenticated_update ON public.advertisements;
DROP POLICY IF EXISTS "Anyone can view active advertisements" ON public.advertisements;
DROP POLICY IF EXISTS advertisements_public_select ON public.advertisements;

-- Remove exact duplicate public-read policies; retain one equivalent policy.
DROP POLICY IF EXISTS anime_comments_select ON public.anime_comments;
DROP POLICY IF EXISTS anime_comments_select_public ON public.anime_comments;
DROP POLICY IF EXISTS anime_likes_select ON public.anime_likes;
DROP POLICY IF EXISTS anime_likes_select_public ON public.anime_likes;
DROP POLICY IF EXISTS review_likes_public_select ON public.review_likes;

-- Keep the current canonical own-row policies and remove exact legacy duplicates.
DROP POLICY IF EXISTS status_delete_own ON public.user_anime_status;
DROP POLICY IF EXISTS status_insert_own ON public.user_anime_status;
DROP POLICY IF EXISTS status_select_own ON public.user_anime_status;
DROP POLICY IF EXISTS status_update_own ON public.user_anime_status;
DROP POLICY IF EXISTS ratings_delete_own ON public.user_ratings;
DROP POLICY IF EXISTS ratings_insert_own ON public.user_ratings;
DROP POLICY IF EXISTS ratings_select_own ON public.user_ratings;
DROP POLICY IF EXISTS ratings_update_own ON public.user_ratings;
