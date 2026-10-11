-- Server-side filtering, bounded result sets, and broader title matching for the Discover page.
-- Keeps the public catalog policy by selecting only from animecia_public_anime.
CREATE OR REPLACE FUNCTION public.search_anime_catalog_v3(
  p_query text DEFAULT NULL,
  p_year integer DEFAULT NULL,
  p_season text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_format text DEFAULT NULL,
  p_genre_ids bigint[] DEFAULT NULL,
  p_studio_id bigint DEFAULT NULL,
  p_min_rating numeric DEFAULT NULL,
  p_sort text DEFAULT 'title',
  p_limit integer DEFAULT 24,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id bigint,
  title text,
  title_japanese text,
  title_native text,
  title_user_preferred text,
  title_romaji text,
  title_english text,
  english_title text,
  cover_image text,
  banner_image text,
  format text,
  genre text,
  description text,
  review text,
  synopsis text,
  official_url text,
  site_url text,
  streaming_links jsonb,
  start_date date,
  end_date date,
  episodes integer,
  duration integer,
  season text,
  season_year integer,
  status text,
  source text,
  average_score numeric,
  popularity integer,
  favourites_count integer,
  search_rank real,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT
      a.id, a.title, a.title_japanese, a.title_native, a.title_user_preferred,
      a.title_romaji, a.title_english, a.english_title, a.cover_image,
      a.banner_image, a.format, a.genre, a.description, a.review, a.synopsis,
      a.official_url, a.site_url, a.streaming_links, a.start_date, a.end_date,
      a.episodes, a.duration, a.season, a.season_year, a.status, a.source,
      COALESCE(e.average_rating, a.average_score)::numeric AS average_score,
      COALESCE(e.average_rating, a.average_score / 10.0)::numeric AS sort_rating,
      a.popularity,
      COALESCE(e.favorite_count, a.favourites_count, 0)::integer AS favourites_count,
      count(*) OVER() AS total_count,
      0::real AS search_rank,
      COALESCE(
        r.reading,
        CASE
          WHEN src.title_kana ~ '[ぁ-んァ-ヶ]'
           AND src.title_kana !~ '[A-Za-z一-龥々]'
          THEN src.title_kana
          ELSE NULL
        END,
        a.title_japanese, a.title_native, a.title_romaji, a.title
      ) AS title_sort_key
    FROM public.animecia_public_anime a
    LEFT JOIN public.anime src ON src.id = a.id
    LEFT JOIN public.anime_engagement_summary e ON e.anime_id = a.id
    LEFT JOIN public.anime_title_reading_overrides r ON r.anime_id = a.id
    WHERE
      (
        nullif(btrim(p_query), '') IS NULL
        OR lower(COALESCE(a.title_japanese, '')) LIKE '%' || lower(btrim(p_query)) || '%'
        OR lower(COALESCE(a.title_native, '')) LIKE '%' || lower(btrim(p_query)) || '%'
        OR lower(COALESCE(a.title, '')) LIKE '%' || lower(btrim(p_query)) || '%'
        OR lower(COALESCE(a.title_romaji, '')) LIKE '%' || lower(btrim(p_query)) || '%'
        OR lower(COALESCE(a.title_english, '')) LIKE '%' || lower(btrim(p_query)) || '%'
        OR lower(COALESCE(a.english_title, '')) LIKE '%' || lower(btrim(p_query)) || '%'
        OR lower(COALESCE(a.title_user_preferred, '')) LIKE '%' || lower(btrim(p_query)) || '%'
        OR lower(COALESCE(a.original_title, '')) LIKE '%' || lower(btrim(p_query)) || '%'
        OR EXISTS (
          SELECT 1 FROM unnest(COALESCE(a.search_aliases, ARRAY[]::text[])) alias
          WHERE lower(alias) LIKE '%' || lower(btrim(p_query)) || '%'
        )
      )
      AND (p_year IS NULL OR a.season_year = p_year)
      AND (p_season IS NULL OR lower(a.season) = lower(p_season))
      AND (p_status IS NULL OR a.status = p_status)
      AND (
        p_format IS NULL
        OR upper(a.format) = upper(p_format)
        OR (upper(p_format) = 'MOVIE' AND upper(a.format) = 'FILM')
      )
      AND (
        cardinality(COALESCE(p_genre_ids, ARRAY[]::bigint[])) = 0
        OR NOT EXISTS (
          SELECT 1
          FROM unnest(COALESCE(p_genre_ids, ARRAY[]::bigint[])) selected(genre_id)
          WHERE NOT EXISTS (
            SELECT 1 FROM public.anime_genres ag
            WHERE ag.anime_id = a.id AND ag.genre_id = selected.genre_id
          )
        )
      )
      AND (p_studio_id IS NULL OR EXISTS (
        SELECT 1 FROM public.anime_studios ast
        WHERE ast.anime_id = a.id AND ast.studio_id = p_studio_id
      ))
      AND (
        p_min_rating IS NULL
        OR COALESCE(e.average_rating, a.average_score / 10.0) >= p_min_rating
      )
  )
  SELECT
    id, title, title_japanese, title_native, title_user_preferred, title_romaji,
    title_english, english_title, cover_image, banner_image, format, genre,
    description, review, synopsis, official_url, site_url, streaming_links,
    start_date, end_date, episodes, duration, season, season_year, status,
    source, average_score, popularity, favourites_count, search_rank, total_count
  FROM base
  ORDER BY
    CASE WHEN p_sort IN ('score','rating') THEN sort_rating END DESC NULLS LAST,
    CASE WHEN p_sort = 'popular' THEN favourites_count END DESC NULLS LAST,
    CASE WHEN p_sort IN ('new','newest') THEN start_date END DESC NULLS LAST,
    CASE WHEN p_sort = 'oldest' THEN start_date END ASC NULLS LAST,
    CASE WHEN p_sort = 'title' THEN title_sort_key END COLLATE "ja-x-icu" ASC NULLS LAST,
    id ASC
  LIMIT greatest(1, least(COALESCE(p_limit, 24), 300))
  OFFSET greatest(COALESCE(p_offset, 0), 0);
$function$;

REVOKE ALL ON FUNCTION public.search_anime_catalog_v3(text, integer, text, text, text, bigint[], bigint, numeric, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_anime_catalog_v3(text, integer, text, text, text, bigint[], bigint, numeric, text, integer, integer) TO anon, authenticated;
