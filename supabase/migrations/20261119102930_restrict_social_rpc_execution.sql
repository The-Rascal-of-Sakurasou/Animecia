-- User-only actions must not be callable by anonymous clients.
REVOKE INSERT,DELETE ON TABLE public.profiles FROM anon,authenticated;
GRANT SELECT ON TABLE public.profiles TO anon,authenticated;
GRANT UPDATE ON TABLE public.profiles TO authenticated;
REVOKE EXECUTE ON FUNCTION public.toggle_user_follow(uuid) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.toggle_social_post_like(uuid) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.toggle_social_post_repost(uuid) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.toggle_social_post_bookmark(uuid) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.delete_social_post(uuid) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.create_message_thread(uuid[],boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_profile_follow_stats(uuid) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_user_follow(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_social_post_like(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_social_post_repost(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_social_post_bookmark(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_social_post(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_message_thread(uuid[],boolean,text) TO authenticated;
DROP POLICY IF EXISTS "Visible profile follows are readable" ON public.user_follows;
CREATE POLICY "Visible profile follows are readable" ON public.user_follows
 FOR SELECT TO anon,authenticated
 USING (
  follower_id=(SELECT auth.uid()) OR following_id=(SELECT auth.uid())
  OR (
   EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=follower_id AND p.is_public AND p.show_user_follows)
   AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=following_id AND p.is_public AND p.show_user_follows)
  )
 );
