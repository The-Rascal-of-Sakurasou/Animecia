-- Tighten legacy visitor-based comment and like tables. The canonical visitor
-- policies bind writes to the request's x-visitor-id header; broad legacy
-- policies would otherwise override them because permissive policies are ORed.
DROP POLICY IF EXISTS anime_comments_delete ON public.anime_comments;
DROP POLICY IF EXISTS anime_comments_insert ON public.anime_comments;
DROP POLICY IF EXISTS anime_comments_insert_public ON public.anime_comments;
DROP POLICY IF EXISTS "public can post comments" ON public.anime_comments;

DROP POLICY IF EXISTS anime_likes_insert ON public.anime_likes;
DROP POLICY IF EXISTS anime_likes_insert_public ON public.anime_likes;
DROP POLICY IF EXISTS "public can add likes" ON public.anime_likes;
DROP POLICY IF EXISTS "public can read likes" ON public.anime_likes;
