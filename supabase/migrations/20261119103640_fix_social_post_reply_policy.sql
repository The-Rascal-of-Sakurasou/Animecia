-- Ensure reply and quote references are checked against the inserted post row.
DROP POLICY IF EXISTS "Users create their own posts" ON public.social_posts;
CREATE POLICY "Users create their own posts" ON public.social_posts
FOR INSERT TO authenticated
WITH CHECK (
 author_id=(SELECT auth.uid())
 AND char_length(body)<=4000
 AND (length(btrim(body))>0 OR attachment_path IS NOT NULL)
 AND (reply_to_id IS NULL OR EXISTS(
  SELECT 1 FROM public.social_posts parent
  WHERE parent.id=public.social_posts.reply_to_id AND parent.deleted_at IS NULL
 ))
 AND (quote_post_id IS NULL OR EXISTS(
  SELECT 1 FROM public.social_posts quoted
  WHERE quoted.id=public.social_posts.quote_post_id AND quoted.deleted_at IS NULL
 ))
);
