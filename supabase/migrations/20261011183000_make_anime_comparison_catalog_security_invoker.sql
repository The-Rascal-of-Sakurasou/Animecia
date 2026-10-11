-- The comparison catalog only reads from the policy-filtered public view.
-- Run as the caller so public.anime RLS is enforced consistently.
ALTER FUNCTION public.get_anime_comparison_catalog(bigint[]) SECURITY INVOKER;