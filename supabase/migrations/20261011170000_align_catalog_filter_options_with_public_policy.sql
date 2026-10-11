-- Keep the year, studio, and genre-count filter options aligned with the
-- canonical public catalog policy. The public view already enforces origin,
-- first-release date, format, duplicate, sensitive-visual, adult/preschool,
-- and promotional-media rules.
CREATE OR REPLACE FUNCTION public.get_catalog_genre_counts()
RETURNS TABLE(id bigint, name text, anime_count bigint)
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $function$
  SELECT g.id, g.name, count(DISTINCT a.id)::bigint
  FROM public.genres g
  LEFT JOIN public.anime_genres ag ON ag.genre_id = g.id
  LEFT JOIN public.animecia_public_anime a ON a.id = ag.anime_id
  WHERE g.name = ANY (ARRAY['SF','アイドル','アクション','コメディ','サスペンス','ショート','スポーツ','ドラマ','ファミリー','ファンタジー','ホラー','ミリタリー','メカ','冒険','学園','恋愛','戦争','戦記','推理','日常','歴史','異世界','青春','音楽','魔法少女'])
  GROUP BY g.id, g.name
  ORDER BY array_position(ARRAY['SF','アイドル','アクション','コメディ','サスペンス','ショート','スポーツ','ドラマ','ファミリー','ファンタジー','ホラー','ミリタリー','メカ','冒険','学園','恋愛','戦争','戦記','推理','日常','歴史','異世界','青春','音楽','魔法少女']::text[], g.name);
$function$;

CREATE OR REPLACE FUNCTION public.get_catalog_studios()
RETURNS TABLE(id bigint, name text)
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $function$
  SELECT DISTINCT s.id, s.name
  FROM public.studios s
  JOIN public.anime_studios ast ON ast.studio_id = s.id
  JOIN public.animecia_public_anime a ON a.id = ast.anime_id
  ORDER BY s.name;
$function$;

CREATE OR REPLACE FUNCTION public.get_catalog_years()
RETURNS TABLE(year integer)
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $function$
  SELECT DISTINCT COALESCE(a.season_year, EXTRACT(YEAR FROM a.start_date)::int) AS year
  FROM public.animecia_public_anime a
  WHERE COALESCE(a.season_year, EXTRACT(YEAR FROM a.start_date)::int) IS NOT NULL
  ORDER BY year DESC;
$function$;
