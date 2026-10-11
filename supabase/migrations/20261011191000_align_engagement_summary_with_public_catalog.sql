-- Align engagement summaries with the actual public catalog, including
-- works whose Japanese origin is still unknown but which otherwise qualify.
-- The public catalog view remains the single source of publication eligibility.
ALTER FUNCTION public.search_anime_catalog_v3(
  text, integer, text, text, text, bigint[], bigint, numeric, text, integer, integer
) SECURITY INVOKER;

CREATE OR REPLACE VIEW public.anime_engagement_summary
WITH (security_invoker = true)
AS
SELECT
  a.id AS anime_id,
  COALESCE(f.favorite_count, 0::bigint) AS favorite_count,
  COALESCE(r.review_count, 0::bigint) AS review_count,
  ur.average_rating,
  COALESCE(ur.rating_count, 0::bigint) AS rating_count,
  COALESCE(f.favorite_count, 0::bigint)
    + COALESCE(r.review_count, 0::bigint)
    + COALESCE(ur.rating_count, 0::bigint) AS engagement_count
FROM public.animecia_public_anime a
LEFT JOIN (
  SELECT favorites.anime_id, count(*)::bigint AS favorite_count
  FROM public.favorites
  GROUP BY favorites.anime_id
) f ON f.anime_id = a.id
LEFT JOIN (
  SELECT reviews.anime_id, count(*)::bigint AS review_count
  FROM public.reviews
  GROUP BY reviews.anime_id
) r ON r.anime_id = a.id
LEFT JOIN (
  SELECT user_ratings.anime_id,
         round(avg(user_ratings.rating), 2) AS average_rating,
         count(*)::bigint AS rating_count
  FROM public.user_ratings
  GROUP BY user_ratings.anime_id
) ur ON ur.anime_id = a.id;

GRANT SELECT ON public.anime_engagement_summary TO anon, authenticated;
