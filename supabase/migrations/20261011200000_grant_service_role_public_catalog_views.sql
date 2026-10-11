-- The static SEO generator uses the server-side Supabase key.
-- Grant that role access to the two read-only public catalog views it consumes.
GRANT SELECT ON public.animecia_public_anime TO service_role;
GRANT SELECT ON public.anime_engagement_summary TO service_role;
