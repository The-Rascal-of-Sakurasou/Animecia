-- Follow counts are intentionally public because user_follows has a public
-- SELECT policy. SECURITY INVOKER avoids bypassing row-level security.
ALTER FUNCTION public.get_profile_follow_stats(uuid) SECURITY INVOKER;
GRANT EXECUTE ON FUNCTION public.get_profile_follow_stats(uuid) TO anon, authenticated;
