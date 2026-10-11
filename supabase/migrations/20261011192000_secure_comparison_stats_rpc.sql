-- Avoid exposing raw private engagement tables through a public SECURITY DEFINER RPC.
-- Return only aggregate data for works already present in the public catalog.
CREATE OR REPLACE FUNCTION public.get_anime_comparison_stats(p_anime_ids bigint[])
RETURNS TABLE(
  anime_id bigint,
  average_rating numeric,
  rating_count bigint,
  favorite_count bigint,
  review_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  WITH ids AS (
    SELECT unnest(COALESCE(p_anime_ids, '{}'::bigint[])) AS anime_id
  )
  SELECT
    i.anime_id,
    s.average_rating,
    COALESCE(s.rating_count, 0::bigint) AS rating_count,
    COALESCE(s.favorite_count, 0::bigint) AS favorite_count,
    COALESCE(s.review_count, 0::bigint) AS review_count
  FROM ids i
  JOIN public.animecia_public_anime a ON a.id = i.anime_id
  LEFT JOIN public.anime_engagement_summary s ON s.anime_id = i.anime_id
  ORDER BY array_position(COALESCE(p_anime_ids, '{}'::bigint[]), i.anime_id);
$function$;

REVOKE ALL ON FUNCTION public.get_anime_comparison_stats(bigint[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_anime_comparison_stats(bigint[]) TO anon, authenticated;
