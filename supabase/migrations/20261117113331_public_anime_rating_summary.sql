CREATE OR REPLACE FUNCTION public.get_anime_rating_summary()
RETURNS TABLE (anime_id uuid, average_score numeric, rating_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT r.anime_id, round(avg(r.score)::numeric, 2) AS average_score, count(*)::bigint AS rating_count
  FROM public.ratings r JOIN public.anime a ON a.id = r.anime_id
  WHERE a.is_published = true GROUP BY r.anime_id HAVING count(*) >= 5;
$function$;
REVOKE ALL ON FUNCTION public.get_anime_rating_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_anime_rating_summary() TO anon, authenticated;
