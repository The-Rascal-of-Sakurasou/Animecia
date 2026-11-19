-- ANIXIA social profile, community, follow, and private messaging schema.
ALTER TABLE public.profiles
 ADD COLUMN IF NOT EXISTS avatar_position_x integer NOT NULL DEFAULT 50,
 ADD COLUMN IF NOT EXISTS avatar_position_y integer NOT NULL DEFAULT 50,
 ADD COLUMN IF NOT EXISTS avatar_zoom integer NOT NULL DEFAULT 100,
 ADD COLUMN IF NOT EXISTS background_url text,
 ADD COLUMN IF NOT EXISTS background_position_x integer NOT NULL DEFAULT 50,
 ADD COLUMN IF NOT EXISTS background_position_y integer NOT NULL DEFAULT 50,
 ADD COLUMN IF NOT EXISTS background_zoom integer NOT NULL DEFAULT 100,
 ADD COLUMN IF NOT EXISTS show_posts boolean NOT NULL DEFAULT true,
 ADD COLUMN IF NOT EXISTS show_favorites boolean NOT NULL DEFAULT true,
 ADD COLUMN IF NOT EXISTS show_anime_follows boolean NOT NULL DEFAULT true,
 ADD COLUMN IF NOT EXISTS show_watch_status boolean NOT NULL DEFAULT true,
 ADD COLUMN IF NOT EXISTS show_ratings boolean NOT NULL DEFAULT true,
 ADD COLUMN IF NOT EXISTS show_reviews boolean NOT NULL DEFAULT true,
 ADD COLUMN IF NOT EXISTS show_user_follows boolean NOT NULL DEFAULT true,
 ADD COLUMN IF NOT EXISTS show_ranking boolean NOT NULL DEFAULT true;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_uidx ON public.profiles(lower(btrim(username))) WHERE username IS NOT NULL AND btrim(username)<>'';
DROP POLICY IF EXISTS "Public profiles are visible" ON public.profiles;
CREATE POLICY "Public profiles are visible" ON public.profiles FOR SELECT TO anon,authenticated USING(is_public OR id=(SELECT auth.uid()));
GRANT SELECT ON public.profiles TO anon,authenticated;
GRANT UPDATE ON public.profiles TO authenticated;

CREATE TABLE IF NOT EXISTS public.user_follows(
 follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(follower_id,following_id),CHECK(follower_id<>following_id)
);
CREATE INDEX IF NOT EXISTS user_follows_following_created_idx ON public.user_follows(following_id,created_at DESC);
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visible profile follows are readable" ON public.user_follows FOR SELECT TO anon,authenticated
 USING(EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=follower_id AND p.is_public AND p.show_user_follows)
 AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=following_id AND p.is_public AND p.show_user_follows));
CREATE POLICY "Users follow public profiles" ON public.user_follows FOR INSERT TO authenticated
 WITH CHECK(follower_id=(SELECT auth.uid()) AND following_id<>(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=following_id AND p.is_public));
CREATE POLICY "Users unfollow themselves" ON public.user_follows FOR DELETE TO authenticated USING(follower_id=(SELECT auth.uid()));
GRANT SELECT ON public.user_follows TO anon,authenticated;
GRANT INSERT,DELETE ON public.user_follows TO authenticated;

CREATE TABLE IF NOT EXISTS public.social_posts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 body text NOT NULL DEFAULT '',
 attachment_url text,attachment_path text,attachment_type text,
 reply_to_id uuid REFERENCES public.social_posts(id) ON DELETE SET NULL,
 quote_post_id uuid REFERENCES public.social_posts(id) ON DELETE SET NULL,
 deleted_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(char_length(body)<=4000),CHECK(length(btrim(body))>0 OR attachment_path IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS social_posts_feed_idx ON public.social_posts(created_at DESC) WHERE deleted_at IS NULL AND reply_to_id IS NULL;
CREATE INDEX IF NOT EXISTS social_posts_author_idx ON public.social_posts(author_id,created_at DESC);
CREATE INDEX IF NOT EXISTS social_posts_reply_idx ON public.social_posts(reply_to_id,created_at ASC) WHERE deleted_at IS NULL;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public posts are readable" ON public.social_posts FOR SELECT TO anon,authenticated
 USING(deleted_at IS NULL AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=author_id AND p.is_public AND p.show_posts));
CREATE POLICY "Authors can read their own posts" ON public.social_posts FOR SELECT TO authenticated USING(author_id=(SELECT auth.uid()));
CREATE POLICY "Users create their own posts" ON public.social_posts FOR INSERT TO authenticated
 WITH CHECK(author_id=(SELECT auth.uid()) AND char_length(body)<=4000 AND (length(btrim(body))>0 OR attachment_path IS NOT NULL)
 AND (reply_to_id IS NULL OR EXISTS(SELECT 1 FROM public.social_posts p WHERE p.id=public.social_posts.reply_to_id AND p.deleted_at IS NULL))
 AND (quote_post_id IS NULL OR EXISTS(SELECT 1 FROM public.social_posts p WHERE p.id=public.social_posts.quote_post_id AND p.deleted_at IS NULL)));
CREATE POLICY "Authors update their own posts" ON public.social_posts FOR UPDATE TO authenticated
 USING(author_id=(SELECT auth.uid())) WITH CHECK(author_id=(SELECT auth.uid()));
GRANT SELECT ON public.social_posts TO anon,authenticated;
GRANT INSERT,UPDATE ON public.social_posts TO authenticated;

CREATE TABLE IF NOT EXISTS public.social_post_media(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
 uploader_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,storage_path text NOT NULL,public_url text NOT NULL,
 mime_type text NOT NULL,sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order BETWEEN 0 AND 3),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS social_post_media_post_order_idx ON public.social_post_media(post_id,sort_order);
ALTER TABLE public.social_post_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visible post media is readable" ON public.social_post_media FOR SELECT TO anon,authenticated
 USING(EXISTS(SELECT 1 FROM public.social_posts p WHERE p.id=post_id AND p.deleted_at IS NULL));
CREATE POLICY "Authors add media to their posts" ON public.social_post_media FOR INSERT TO authenticated
 WITH CHECK(uploader_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.social_posts p WHERE p.id=post_id AND p.author_id=(SELECT auth.uid())));
CREATE POLICY "Uploaders remove their post media" ON public.social_post_media FOR DELETE TO authenticated USING(uploader_id=(SELECT auth.uid()));
GRANT SELECT ON public.social_post_media TO anon,authenticated;
GRANT INSERT,DELETE ON public.social_post_media TO authenticated;

CREATE TABLE IF NOT EXISTS public.social_post_likes(
 post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(post_id,user_id)
);
CREATE TABLE IF NOT EXISTS public.social_post_reposts(
 post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(post_id,user_id)
);
CREATE TABLE IF NOT EXISTS public.social_post_bookmarks(
 post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(post_id,user_id)
);
CREATE INDEX IF NOT EXISTS social_post_likes_post_idx ON public.social_post_likes(post_id);
CREATE INDEX IF NOT EXISTS social_post_reposts_post_idx ON public.social_post_reposts(post_id);
CREATE INDEX IF NOT EXISTS social_post_bookmarks_user_idx ON public.social_post_bookmarks(user_id,created_at DESC);
ALTER TABLE public.social_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_post_reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_post_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public post likes are readable" ON public.social_post_likes FOR SELECT TO anon,authenticated USING(EXISTS(SELECT 1 FROM public.social_posts p WHERE p.id=post_id AND p.deleted_at IS NULL));
CREATE POLICY "Users add their own likes" ON public.social_post_likes FOR INSERT TO authenticated WITH CHECK(user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.social_posts p WHERE p.id=post_id AND p.deleted_at IS NULL));
CREATE POLICY "Users remove their own likes" ON public.social_post_likes FOR DELETE TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY "Public post reposts are readable" ON public.social_post_reposts FOR SELECT TO anon,authenticated USING(EXISTS(SELECT 1 FROM public.social_posts p WHERE p.id=post_id AND p.deleted_at IS NULL));
CREATE POLICY "Users add their own reposts" ON public.social_post_reposts FOR INSERT TO authenticated WITH CHECK(user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.social_posts p WHERE p.id=post_id AND p.deleted_at IS NULL));
CREATE POLICY "Users remove their own reposts" ON public.social_post_reposts FOR DELETE TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY "Users read their own bookmarks" ON public.social_post_bookmarks FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY "Users add their own bookmarks" ON public.social_post_bookmarks FOR INSERT TO authenticated WITH CHECK(user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.social_posts p WHERE p.id=post_id AND p.deleted_at IS NULL));
CREATE POLICY "Users remove their own bookmarks" ON public.social_post_bookmarks FOR DELETE TO authenticated USING(user_id=(SELECT auth.uid()));
GRANT SELECT ON public.social_post_likes,public.social_post_reposts TO anon,authenticated;
GRANT INSERT,DELETE ON public.social_post_likes,public.social_post_reposts,public.social_post_bookmarks TO authenticated;
GRANT SELECT ON public.social_post_bookmarks TO authenticated;

CREATE OR REPLACE FUNCTION public.get_profile_follow_stats(p_profile_id uuid)
RETURNS TABLE(followers_count bigint,following_count bigint,is_following boolean)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $$ SELECT (SELECT count(*) FROM public.user_follows uf WHERE uf.following_id=p_profile_id),
 (SELECT count(*) FROM public.user_follows uf WHERE uf.follower_id=p_profile_id),
 EXISTS(SELECT 1 FROM public.user_follows uf WHERE uf.follower_id=(SELECT auth.uid()) AND uf.following_id=p_profile_id)
 WHERE EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=p_profile_id AND (p.is_public OR p.id=(SELECT auth.uid()))); $$;
REVOKE ALL ON FUNCTION public.get_profile_follow_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_follow_stats(uuid) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.toggle_user_follow(p_following_id uuid)
RETURNS TABLE(is_following boolean) LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
DECLARE v_user_id uuid := (SELECT auth.uid());
BEGIN
 IF v_user_id IS NULL OR p_following_id IS NULL OR p_following_id=v_user_id THEN RAISE EXCEPTION 'Invalid follow request'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=p_following_id AND p.is_public) THEN RAISE EXCEPTION 'Profile unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM public.user_follows uf WHERE uf.follower_id=v_user_id AND uf.following_id=p_following_id)
 THEN DELETE FROM public.user_follows WHERE follower_id=v_user_id AND following_id=p_following_id;
 ELSE INSERT INTO public.user_follows(follower_id,following_id) VALUES(v_user_id,p_following_id); END IF;
 RETURN QUERY SELECT EXISTS(SELECT 1 FROM public.user_follows uf WHERE uf.follower_id=v_user_id AND uf.following_id=p_following_id);
END; $$;
REVOKE ALL ON FUNCTION public.toggle_user_follow(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_user_follow(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.toggle_social_post_like(p_post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$ DECLARE u uuid := (SELECT auth.uid()); BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF EXISTS(SELECT 1 FROM public.social_post_likes WHERE post_id=p_post_id AND user_id=u)
 THEN DELETE FROM public.social_post_likes WHERE post_id=p_post_id AND user_id=u;
 ELSE INSERT INTO public.social_post_likes(post_id,user_id) VALUES(p_post_id,u); END IF;
END; $$;
CREATE OR REPLACE FUNCTION public.toggle_social_post_repost(p_post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$ DECLARE u uuid := (SELECT auth.uid()); BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF EXISTS(SELECT 1 FROM public.social_post_reposts WHERE post_id=p_post_id AND user_id=u)
 THEN DELETE FROM public.social_post_reposts WHERE post_id=p_post_id AND user_id=u;
 ELSE INSERT INTO public.social_post_reposts(post_id,user_id) VALUES(p_post_id,u); END IF;
END; $$;
CREATE OR REPLACE FUNCTION public.toggle_social_post_bookmark(p_post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$ DECLARE u uuid := (SELECT auth.uid()); BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF EXISTS(SELECT 1 FROM public.social_post_bookmarks WHERE post_id=p_post_id AND user_id=u)
 THEN DELETE FROM public.social_post_bookmarks WHERE post_id=p_post_id AND user_id=u;
 ELSE INSERT INTO public.social_post_bookmarks(post_id,user_id) VALUES(p_post_id,u); END IF;
END; $$;
CREATE OR REPLACE FUNCTION public.delete_social_post(p_post_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$ BEGIN
 UPDATE public.social_posts SET deleted_at=now(),updated_at=now() WHERE id=p_post_id AND author_id=(SELECT auth.uid()) AND deleted_at IS NULL;
 RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.toggle_social_post_like(uuid),public.toggle_social_post_repost(uuid),public.toggle_social_post_bookmark(uuid),public.delete_social_post(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_social_post_like(uuid),public.toggle_social_post_repost(uuid),public.toggle_social_post_bookmark(uuid),public.delete_social_post(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.message_threads(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),title text,is_group boolean NOT NULL DEFAULT false,
 created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),CHECK(title IS NULL OR char_length(title)<=80)
);
CREATE TABLE IF NOT EXISTS public.message_members(
 thread_id uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 joined_at timestamptz NOT NULL DEFAULT now(),last_read_at timestamptz,PRIMARY KEY(thread_id,user_id)
);
CREATE INDEX IF NOT EXISTS message_members_user_joined_idx ON public.message_members(user_id,joined_at DESC);
CREATE TABLE IF NOT EXISTS public.thread_messages(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),thread_id uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
 sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,body text NOT NULL DEFAULT '',
 attachment_url text,attachment_path text,attachment_type text,created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(char_length(body)<=4000),CHECK(length(btrim(body))>0 OR attachment_path IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS thread_messages_thread_created_idx ON public.thread_messages(thread_id,created_at ASC);
CREATE INDEX IF NOT EXISTS thread_messages_sender_idx ON public.thread_messages(sender_id,created_at DESC);
CREATE TABLE IF NOT EXISTS public.thread_message_media(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),message_id uuid NOT NULL REFERENCES public.thread_messages(id) ON DELETE CASCADE,
 uploader_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,storage_path text NOT NULL,public_url text,mime_type text NOT NULL,
 sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order BETWEEN 0 AND 3),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS thread_message_media_message_order_idx ON public.thread_message_media(message_id,sort_order);
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_message_media ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.is_message_thread_member(p_thread_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT (SELECT auth.uid()) IS NOT NULL AND EXISTS(SELECT 1 FROM public.message_members mm WHERE mm.thread_id=p_thread_id AND mm.user_id=(SELECT auth.uid())); $$;
CREATE OR REPLACE FUNCTION private.is_message_thread_creator(p_thread_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT (SELECT auth.uid()) IS NOT NULL AND EXISTS(SELECT 1 FROM public.message_threads mt WHERE mt.id=p_thread_id AND mt.created_by=(SELECT auth.uid())); $$;
REVOKE ALL ON FUNCTION private.is_message_thread_member(uuid),private.is_message_thread_creator(uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_message_thread_member(uuid),private.is_message_thread_creator(uuid) TO authenticated;

CREATE POLICY "Thread members can read their threads" ON public.message_threads FOR SELECT TO authenticated USING(private.is_message_thread_member(id));
CREATE POLICY "Users create their own threads" ON public.message_threads FOR INSERT TO authenticated WITH CHECK(created_by=(SELECT auth.uid()));
CREATE POLICY "Thread members can read member lists" ON public.message_members FOR SELECT TO authenticated USING(private.is_message_thread_member(thread_id));
CREATE POLICY "Thread creators add members" ON public.message_members FOR INSERT TO authenticated
 WITH CHECK(private.is_message_thread_creator(thread_id) AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=user_id AND (p.is_public OR p.id=(SELECT auth.uid()))));
CREATE POLICY "Users update their own read receipts" ON public.message_members FOR UPDATE TO authenticated
 USING(user_id=(SELECT auth.uid()) AND private.is_message_thread_member(thread_id))
 WITH CHECK(user_id=(SELECT auth.uid()) AND private.is_message_thread_member(thread_id));
GRANT SELECT,INSERT ON public.message_threads TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.message_members TO authenticated;
CREATE POLICY "Thread members read messages" ON public.thread_messages FOR SELECT TO authenticated USING(private.is_message_thread_member(thread_id));
CREATE POLICY "Members send messages as themselves" ON public.thread_messages FOR INSERT TO authenticated WITH CHECK(sender_id=(SELECT auth.uid()) AND private.is_message_thread_member(thread_id));
CREATE POLICY "Senders delete their messages" ON public.thread_messages FOR DELETE TO authenticated USING(sender_id=(SELECT auth.uid()) AND private.is_message_thread_member(thread_id));
GRANT SELECT,INSERT,DELETE ON public.thread_messages TO authenticated;
CREATE POLICY "Thread members read message media" ON public.thread_message_media FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.thread_messages m WHERE m.id=message_id AND private.is_message_thread_member(m.thread_id)));
CREATE POLICY "Senders add their message media" ON public.thread_message_media FOR INSERT TO authenticated
 WITH CHECK(uploader_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.thread_messages m WHERE m.id=message_id AND m.sender_id=(SELECT auth.uid()) AND private.is_message_thread_member(m.thread_id)));
CREATE POLICY "Uploaders delete their message media" ON public.thread_message_media FOR DELETE TO authenticated USING(uploader_id=(SELECT auth.uid()));
GRANT SELECT,INSERT,DELETE ON public.thread_message_media TO authenticated;

CREATE OR REPLACE FUNCTION public.create_message_thread(p_member_ids uuid[],p_is_group boolean DEFAULT false,p_title text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
DECLARE u uuid := (SELECT auth.uid()); members uuid[]; tid uuid; n integer;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT array_agg(member_id ORDER BY member_id) INTO members FROM (SELECT DISTINCT unnest(coalesce(p_member_ids,ARRAY[]::uuid[])) member_id) x WHERE member_id IS NOT NULL;
 IF members IS NULL OR NOT(u=ANY(members)) THEN members:=coalesce(members,ARRAY[]::uuid[])||u; END IF;
 n:=cardinality(members);
 IF n<2 OR n>20 OR (NOT coalesce(p_is_group,false) AND n<>2) THEN RAISE EXCEPTION 'Invalid member count'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(members) member_id LEFT JOIN public.profiles p ON p.id=member_id WHERE p.id IS NULL OR (member_id<>u AND p.is_public IS DISTINCT FROM true))
 THEN RAISE EXCEPTION 'One or more profiles are unavailable'; END IF;
 IF NOT coalesce(p_is_group,false) THEN
  SELECT mt.id INTO tid FROM public.message_threads mt
  WHERE NOT mt.is_group AND EXISTS(SELECT 1 FROM public.message_members mm WHERE mm.thread_id=mt.id AND mm.user_id=u)
   AND EXISTS(SELECT 1 FROM public.message_members mm WHERE mm.thread_id=mt.id AND mm.user_id=(SELECT x FROM unnest(members) x WHERE x<>u LIMIT 1))
   AND (SELECT count(*) FROM public.message_members mm WHERE mm.thread_id=mt.id)=2 LIMIT 1;
  IF tid IS NOT NULL THEN RETURN tid; END IF;
 END IF;
 INSERT INTO public.message_threads(title,is_group,created_by) VALUES(CASE WHEN coalesce(p_is_group,false) THEN nullif(btrim(p_title),'') ELSE NULL END,coalesce(p_is_group,false),u) RETURNING id INTO tid;
 INSERT INTO public.message_members(thread_id,user_id) SELECT tid,member_id FROM unnest(members) member_id;
 RETURN tid;
END; $$;
REVOKE ALL ON FUNCTION public.create_message_thread(uuid[],boolean,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_message_thread(uuid[],boolean,text) TO authenticated;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('community-media','community-media',true,10485760,ARRAY['image/jpeg','image/png','image/webp','image/gif']),
 ('message-media','message-media',false,10485760,ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT(id) DO UPDATE SET public=EXCLUDED.public,file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;
CREATE POLICY "Public read community media" ON storage.objects FOR SELECT TO anon,authenticated USING(bucket_id='community-media');
CREATE POLICY "Users upload their community media" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='community-media' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
CREATE POLICY "Users delete their community media" ON storage.objects FOR DELETE TO authenticated USING(bucket_id='community-media' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
CREATE POLICY "Thread members read private message media" ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='message-media' AND EXISTS(SELECT 1 FROM public.message_members mm WHERE mm.thread_id::text=(storage.foldername(name))[2] AND mm.user_id=(SELECT auth.uid())));
CREATE POLICY "Members upload their private message media" ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='message-media' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text AND EXISTS(SELECT 1 FROM public.message_members mm WHERE mm.thread_id::text=(storage.foldername(name))[2] AND mm.user_id=(SELECT auth.uid())));
CREATE POLICY "Uploaders delete their private message media" ON storage.objects FOR DELETE TO authenticated
 USING(bucket_id='message-media' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text AND EXISTS(SELECT 1 FROM public.message_members mm WHERE mm.thread_id::text=(storage.foldername(name))[2] AND mm.user_id=(SELECT auth.uid())));
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='thread_messages')
 THEN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.thread_messages'; END IF;
END $$;
