-- Cache request-header lookups once per statement in legacy visitor policies.
DROP POLICY IF EXISTS comments_insert_public ON public.anime_comments;
CREATE POLICY comments_insert_public
  ON public.anime_comments
  AS PERMISSIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (visitor_id)::text = (((select current_setting('request.headers'::text, true))::json) ->> 'x-visitor-id'::text)
  );

DROP POLICY IF EXISTS comments_delete_own ON public.anime_comments;
CREATE POLICY comments_delete_own
  ON public.anime_comments
  AS PERMISSIVE
  FOR DELETE
  TO anon, authenticated
  USING (
    (visitor_id)::text = (((select current_setting('request.headers'::text, true))::json) ->> 'x-visitor-id'::text)
  );

DROP POLICY IF EXISTS likes_insert_public ON public.anime_likes;
CREATE POLICY likes_insert_public
  ON public.anime_likes
  AS PERMISSIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    visitor_id = (((select current_setting('request.headers'::text, true))::json) ->> 'x-visitor-id'::text)
  );

DROP POLICY IF EXISTS likes_delete_own ON public.anime_likes;
CREATE POLICY likes_delete_own
  ON public.anime_likes
  AS PERMISSIVE
  FOR DELETE
  TO anon, authenticated
  USING (
    visitor_id = (((select current_setting('request.headers'::text, true))::json) ->> 'x-visitor-id'::text)
  );

DROP POLICY IF EXISTS "public can read comments" ON public.anime_comments;
