-- Keep the genre picker and genre counts aligned with all genres currently
-- registered in Animecia. The prior hard-coded list omitted バトル, ロボット, and 競技.

CREATE OR REPLACE FUNCTION public.get_catalog_genres()
RETURNS TABLE(id bigint, name text)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT g.id, g.name
  FROM public.genres g
  WHERE g.name = ANY (ARRAY[
    'SF','アイドル','アクション','バトル','コメディ','サスペンス','ショート',
    'スポーツ','競技','ドラマ','ファミリー','ファンタジー','ホラー','ミリタリー',
    'メカ','ロボット','冒険','学園','恋愛','戦争','戦記','推理','日常','歴史',
    '異世界','青春','音楽','魔法少女'
  ]::text[])
  ORDER BY array_position(ARRAY[
    'SF','アイドル','アクション','バトル','コメディ','サスペンス','ショート',
    'スポーツ','競技','ドラマ','ファミリー','ファンタジー','ホラー','ミリタリー',
    'メカ','ロボット','冒険','学園','恋愛','戦争','戦記','推理','日常','歴史',
    '異世界','青春','音楽','魔法少女'
  ]::text[], g.name);
$function$;

CREATE OR REPLACE FUNCTION public.get_catalog_genre_counts()
RETURNS TABLE(id bigint, name text, anime_count bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT g.id, g.name, count(DISTINCT a.id)::bigint
  FROM public.genres g
  LEFT JOIN public.anime_genres ag ON ag.genre_id = g.id
  LEFT JOIN public.animecia_public_anime a ON a.id = ag.anime_id
  WHERE g.name = ANY (ARRAY[
    'SF','アイドル','アクション','バトル','コメディ','サスペンス','ショート',
    'スポーツ','競技','ドラマ','ファミリー','ファンタジー','ホラー','ミリタリー',
    'メカ','ロボット','冒険','学園','恋愛','戦争','戦記','推理','日常','歴史',
    '異世界','青春','音楽','魔法少女'
  ]::text[])
  GROUP BY g.id, g.name
  ORDER BY array_position(ARRAY[
    'SF','アイドル','アクション','バトル','コメディ','サスペンス','ショート',
    'スポーツ','競技','ドラマ','ファミリー','ファンタジー','ホラー','ミリタリー',
    'メカ','ロボット','冒険','学園','恋愛','戦争','戦記','推理','日常','歴史',
    '異世界','青春','音楽','魔法少女'
  ]::text[], g.name);
$function$;