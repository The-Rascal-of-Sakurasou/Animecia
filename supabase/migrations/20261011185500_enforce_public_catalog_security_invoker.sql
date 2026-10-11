-- Public catalog data must be filtered with the querying role's RLS policies.
ALTER VIEW public.animecia_public_anime SET (security_invoker = true);
ALTER VIEW public.anime_engagement_summary SET (security_invoker = true);
