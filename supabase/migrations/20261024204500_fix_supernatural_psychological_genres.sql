-- Correct AniList genre canonicalization and preserve complete source-backed genre sets.
CREATE OR REPLACE FUNCTION public.expand_catalog_genres(p_name text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
WITH parts AS (
  SELECT trim(x) AS raw
  FROM unnest(regexp_split_to_array(trim(coalesce(p_name,'')), '[・/]')) AS x
),
mapped AS (
  SELECT CASE lower(raw)
    WHEN 'sf' THEN 'SF' WHEN 'sci-fi' THEN 'SF' WHEN 'science fiction' THEN 'SF'
    WHEN 'ファンタジー' THEN 'ファンタジー' WHEN 'fantasy' THEN 'ファンタジー' WHEN '宇宙' THEN 'SF'
    WHEN '超自然' THEN '超自然' WHEN 'supernatural' THEN '超自然'
    WHEN '心理' THEN '心理' WHEN 'psychological' THEN '心理'
    WHEN 'ロボット' THEN 'ロボット' WHEN 'robot' THEN 'ロボット' WHEN 'メカ' THEN 'メカ' WHEN 'mecha' THEN 'メカ'
    WHEN 'アクション' THEN 'アクション' WHEN 'action' THEN 'アクション' WHEN 'ヒーロー' THEN 'アクション' WHEN 'hero' THEN 'アクション'
    WHEN 'バトル' THEN 'バトル' WHEN 'コメディ' THEN 'コメディ' WHEN 'comedy' THEN 'コメディ' WHEN 'ギャグ' THEN 'ギャグ'
    WHEN '恋愛' THEN '恋愛' WHEN 'romance' THEN '恋愛' WHEN 'ラブコメ' THEN 'ラブコメ'
    WHEN '日常' THEN '日常' WHEN 'slice of life' THEN '日常' WHEN 'ほのぼの' THEN 'ほのぼの'
    WHEN 'スポーツ' THEN 'スポーツ' WHEN 'sports' THEN 'スポーツ' WHEN '競技' THEN '競技'
    WHEN 'ホラー' THEN 'ホラー' WHEN 'horror' THEN 'ホラー' WHEN 'サスペンス' THEN 'サスペンス' WHEN 'suspense' THEN 'サスペンス' WHEN 'スリラー' THEN 'サスペンス' WHEN 'thriller' THEN 'サスペンス'
    WHEN '推理' THEN '推理' WHEN 'ミステリー' THEN '推理' WHEN 'mystery' THEN '推理'
    WHEN '歴史' THEN '歴史' WHEN 'historical' THEN '歴史' WHEN '戦記' THEN '戦記' WHEN '戦争' THEN '戦争' WHEN 'ミリタリー' THEN 'ミリタリー' WHEN 'military' THEN 'ミリタリー'
    WHEN 'ドラマ' THEN 'ドラマ' WHEN 'drama' THEN 'ドラマ' WHEN '青春' THEN '青春'
    WHEN '音楽' THEN '音楽' WHEN 'music' THEN '音楽' WHEN 'アイドル' THEN 'アイドル' WHEN '学園' THEN '学園' WHEN 'school' THEN '学園'
    WHEN '魔法' THEN '魔法' WHEN '魔法少女' THEN '魔法少女' WHEN 'mahou shoujo' THEN '魔法少女' WHEN 'magical girl' THEN '魔法少女'
    WHEN '異世界' THEN '異世界' WHEN 'isekai' THEN '異世界' WHEN '冒険' THEN '冒険' WHEN 'adventure' THEN '冒険'
    WHEN 'キッズ' THEN 'キッズ' WHEN 'kids' THEN 'キッズ' WHEN 'ファミリー' THEN 'ファミリー' WHEN 'family' THEN 'ファミリー' WHEN 'ショート' THEN 'ショート'
    ELSE NULL
  END AS mapped_genre
  FROM parts
)
SELECT coalesce(array_agg(DISTINCT mapped_genre ORDER BY mapped_genre) FILTER (WHERE mapped_genre IS NOT NULL), '{}'::text[])
FROM mapped;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_anime_genre_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
BEGIN
  -- Official source genres can exceed five; keep up to eight canonical genres.
  DELETE FROM public.anime_genres ag
  WHERE ag.anime_id = NEW.anime_id
    AND ag.genre_id IN (
      SELECT genre_id FROM (
        SELECT ag2.genre_id,
               row_number() OVER (
                 PARTITION BY ag2.anime_id
                 ORDER BY
                   CASE WHEN g.name='その他' THEN 999 ELSE 0 END,
                   (SELECT count(*) FROM public.anime_genres x WHERE x.genre_id=g.id) DESC,
                   g.id
               ) rn
        FROM public.anime_genres ag2
        JOIN public.genres g ON g.id=ag2.genre_id
        WHERE ag2.anime_id=NEW.anime_id
      ) q
      WHERE q.rn > 8
    );
  RETURN NEW;
END;
$function$;

INSERT INTO public.genres(name)
SELECT wanted.name FROM (VALUES ('心理'),('超自然')) AS wanted(name)
WHERE NOT EXISTS (SELECT 1 FROM public.genres g WHERE g.name=wanted.name);

WITH corrections(anime_id, corrected_genre, genre_names, source_note) AS (
  VALUES
    (4283::bigint,'コメディ, ドラマ, 推理, 恋愛, 超自然, 心理'::text,ARRAY['コメディ','ドラマ','推理','恋愛','超自然','心理']::text[],'AniList ID 101291; https://theanimelist.net/anime/seishun-buta-yarou-wa-bunny-girl-senpai-no-yume-wo-minai'),
    (4436::bigint,'ドラマ, 恋愛, 超自然'::text,ARRAY['ドラマ','恋愛','超自然']::text[],'AniList ID 104157; https://theanimelist.net/anime/seishun-buta-yarou-wa-yumemiru-shoujo-no-yume-wo-minai'),
    (2779::bigint,'ドラマ, 心理, 恋愛, 超自然'::text,ARRAY['ドラマ','心理','恋愛','超自然']::text[],'AniList ID 161474; https://anilist.co/anime/161474/'),
    (2947::bigint,'ドラマ, 恋愛, 超自然'::text,ARRAY['ドラマ','恋愛','超自然']::text[],'AniList ID 154967; https://theanimelist.net/anime/seishun-buta-yarou-wa-odekake-sister-no-yume-wo-minai'),
    (2156::bigint,'ドラマ, 推理, 心理, 恋愛, 超自然'::text,ARRAY['ドラマ','推理','心理','恋愛','超自然']::text[],'AniList ID 171046; https://anilist.co/anime/171046/'),
    (13246::bigint,'ドラマ, 心理, 恋愛, 超自然'::text,ARRAY['ドラマ','心理','恋愛','超自然']::text[],'AniList ID 199340; https://anilist.co/anime/199340/')
)
INSERT INTO public.animecia_public_genre_audit
 (anime_id,current_genre,classification_version,confidence,audit_status,audit_reason,proposed_genre,checked_at,created_at)
SELECT a.id,a.genre,a.genre_classification_version,a.genre_classification_confidence,'verified',
 'Corrected canonicalization: Supernatural -> 超自然; Psychological -> 心理. Source cross-check: '||c.source_note,
 c.corrected_genre,now(),now()
FROM corrections c JOIN public.anime a ON a.id=c.anime_id
ON CONFLICT (anime_id) DO UPDATE
SET current_genre=EXCLUDED.current_genre,
    classification_version=EXCLUDED.classification_version,
    confidence=EXCLUDED.confidence,
    audit_status='verified',
    audit_reason=EXCLUDED.audit_reason,
    proposed_genre=EXCLUDED.proposed_genre,
    checked_at=now()
WHERE public.animecia_public_genre_audit.audit_status IS DISTINCT FROM 'verified'
   OR public.animecia_public_genre_audit.proposed_genre IS DISTINCT FROM EXCLUDED.proposed_genre;

WITH corrections(anime_id, corrected_genre, source_note) AS (
  VALUES
    (4283::bigint,'コメディ, ドラマ, 推理, 恋愛, 超自然, 心理'::text,'AniList ID 101291'),
    (4436::bigint,'ドラマ, 恋愛, 超自然'::text,'AniList ID 104157'),
    (2779::bigint,'ドラマ, 心理, 恋愛, 超自然'::text,'AniList ID 161474'),
    (2947::bigint,'ドラマ, 恋愛, 超自然'::text,'AniList ID 154967'),
    (2156::bigint,'ドラマ, 推理, 心理, 恋愛, 超自然'::text,'AniList ID 171046'),
    (13246::bigint,'ドラマ, 心理, 恋愛, 超自然'::text,'AniList ID 199340')
)
UPDATE public.anime a
SET genre=c.corrected_genre,
    genre_classification_version='animecia-anilist-official-v7-canonical-supernatural-psychological-fix',
    genre_classification_confidence=1.0,
    genre_classification_reasons=array_append(COALESCE(a.genre_classification_reasons,ARRAY[]::text[]),
      'Canonicalization correction: Supernatural -> 超自然; Psychological -> 心理. Source ID: '||c.source_note),
    genre_classified_at=now()
FROM corrections c WHERE a.id=c.anime_id;

DELETE FROM public.anime_genres WHERE anime_id IN (4283,4436,2779,2947,2156,13246);

WITH corrections(anime_id, genre_names) AS (
  VALUES
    (4283::bigint,ARRAY['コメディ','ドラマ','推理','恋愛','超自然','心理']::text[]),
    (4436::bigint,ARRAY['ドラマ','恋愛','超自然']::text[]),
    (2779::bigint,ARRAY['ドラマ','心理','恋愛','超自然']::text[]),
    (2947::bigint,ARRAY['ドラマ','恋愛','超自然']::text[]),
    (2156::bigint,ARRAY['ドラマ','推理','心理','恋愛','超自然']::text[]),
    (13246::bigint,ARRAY['ドラマ','心理','恋愛','超自然']::text[])
)
INSERT INTO public.anime_genres(anime_id,genre_id)
SELECT c.anime_id,g.id
FROM corrections c
CROSS JOIN LATERAL unnest(c.genre_names) AS wanted(name)
JOIN public.genres g ON g.name=wanted.name;
