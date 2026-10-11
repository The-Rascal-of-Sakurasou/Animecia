-- These are maintenance RPCs, not public application actions.
-- Restrict invocation to the Supabase service role.
REVOKE EXECUTE ON FUNCTION public.sync_animecia_genres_from_anilist(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_animecia_genres_from_anilist(integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.trigger_refresh_anime_covers() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_refresh_anime_covers() TO service_role;