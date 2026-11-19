-- Tighten default grants on newly created social tables. RLS remains the row-level boundary.
REVOKE ALL ON TABLE public.profiles,public.user_follows,public.social_posts,public.social_post_media,
 public.social_post_likes,public.social_post_reposts,public.social_post_bookmarks,
 public.message_threads,public.message_members,public.thread_messages,public.thread_message_media
FROM PUBLIC,anon;
GRANT SELECT ON public.profiles TO anon,authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.user_follows TO anon,authenticated;
GRANT INSERT,DELETE ON public.user_follows TO authenticated;
GRANT SELECT ON public.social_posts TO anon,authenticated;
GRANT INSERT,UPDATE ON public.social_posts TO authenticated;
GRANT SELECT ON public.social_post_media TO anon,authenticated;
GRANT INSERT,DELETE ON public.social_post_media TO authenticated;
GRANT SELECT ON public.social_post_likes,public.social_post_reposts TO anon,authenticated;
GRANT INSERT,DELETE ON public.social_post_likes,public.social_post_reposts TO authenticated;
GRANT SELECT,INSERT,DELETE ON public.social_post_bookmarks TO authenticated;
GRANT SELECT,INSERT ON public.message_threads TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.message_members TO authenticated;
GRANT SELECT,INSERT,DELETE ON public.thread_messages TO authenticated;
GRANT SELECT,INSERT,DELETE ON public.thread_message_media TO authenticated;
