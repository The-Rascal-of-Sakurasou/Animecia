-- Animecia catalog policy v3
-- Align the public catalog with the agreed inclusion rules:
-- - Japanese-origin works; unknown origin remains visible unless confirmed non-Japanese.
-- - First release on/after 1963-01-01.
-- - Adult/preschool flags are permitted for regular TV broadcast formats only.
-- - Kids-targeted flag alone is not an exclusion.
-- - Exact duplicates and promotional/music formats are excluded.
-- - Sensitive-visual records remain hidden as a safety safeguard.

CREATE OR REPLACE FUNCTION public.recalculate_anime_catalog_policy()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  reasons text[] := ARRAY[]::text[];
  fmt text := upper(coalesce(new.format, ''));
  country_status text := coalesce(new.original_country_status, 'unknown');
BEGIN
  new.catalog_policy_version := 'v3';
  new.catalog_policy_checked_at := now();

  IF new.start_date IS NULL THEN
    reasons := array_append(reasons, 'unknown_first_release_date');
  ELSIF new.start_date < DATE '1963-01-01' THEN
    reasons := array_append(reasons, 'before_1963-01-01');
  END IF;

  IF fmt NOT IN ('TV', 'TV_SHORT', 'MOVIE', 'OVA', 'OAV', 'ONA', 'SPECIAL') THEN
    reasons := array_append(reasons, 'not_general_anime_format');
  END IF;

  IF (new.original_country_code IS NOT NULL AND upper(new.original_country_code) <> 'JP')
     OR country_status = 'verified_non_jp' THEN
    reasons := array_append(reasons, 'non_japanese_original');
  END IF;

  IF coalesce(new.is_adult, false) AND fmt NOT IN ('TV', 'TV_SHORT') THEN
    reasons := array_append(reasons, 'adult_non_broadcast');
  END IF;

  IF coalesce(new.is_preschool, false) AND fmt NOT IN ('TV', 'TV_SHORT') THEN
    reasons := array_append(reasons, 'preschool_non_broadcast');
  END IF;

  IF coalesce(new.is_sensitive_visual, false) THEN
    reasons := array_append(reasons, 'sensitive_visual_manual_review');
  END IF;

  IF coalesce(new.duplicate_status, 'unique') = 'duplicate' THEN
    reasons := array_append(reasons, 'duplicate');
  END IF;

  new.catalog_policy_reasons := reasons;
  IF cardinality(reasons) > 0 THEN
    new.catalog_policy_decision := 'exclude';
    new.anime_verification_status := 'blocked';
  ELSE
    new.catalog_policy_decision := 'include';
    new.anime_verification_status := 'verified';
  END IF;
  RETURN new;
END;
$function$;

DROP TRIGGER IF EXISTS trg_anime_catalog_policy ON public.anime;
CREATE TRIGGER trg_anime_catalog_policy
BEFORE INSERT OR UPDATE OF
  is_adult, is_preschool, is_japanese, duplicate_status,
  original_country_code, original_country_status, format, start_date,
  is_sensitive_visual
ON public.anime
FOR EACH ROW EXECUTE FUNCTION public.recalculate_anime_catalog_policy();

CREATE OR REPLACE VIEW public.animecia_public_anime AS
SELECT
  id, title, genre, description, review, official_url, english_title,
  recommended, recommended_start_at, recommended_end_at, external_id,
  title_romaji, title_english, title_native, title_japanese, cover_image,
  banner_image, start_date, end_date, episodes, duration, status, format,
  season, season_year, source, average_score, popularity, favourites_count,
  site_url, updated_at, created_at, title_user_preferred,
  anime_verification_status, anime_verification_confidence,
  anime_verification_reasons, search_aliases, streaming_links, genres_synced_at,
  source_provider, source_id, original_source, original_title, original_authors,
  source_metadata, synopsis, synopsis_source, synopsis_updated_at,
  genre_classified_at, genre_classification_version,
  genre_classification_confidence, genre_classification_reasons,
  subgenre_classification_version, subgenres_classified_at,
  start_date_precision, season_source, data_source_updated_at,
  is_adult, is_kids, is_sensitive_visual, is_japanese,
  duplicate_status, duplicate_of_id, duplicate_group_key, duplicate_review_reason
FROM public.anime a
WHERE
  anime_verification_status = 'verified'
  AND coalesce(is_sensitive_visual, false) = false
  AND coalesce(duplicate_status, 'unique') = 'unique'
  AND (
    original_country_code = 'JP'
    OR (
      original_country_code IS NULL
      AND coalesce(original_country_status, 'unknown') <> 'verified_non_jp'
    )
  )
  AND start_date IS NOT NULL
  AND start_date >= DATE '1963-01-01'
  AND upper(coalesce(format, '')) IN ('TV', 'TV_SHORT', 'MOVIE', 'OVA', 'OAV', 'ONA', 'SPECIAL')
  AND (
    coalesce(is_adult, false) = false
    OR upper(coalesce(format, '')) IN ('TV', 'TV_SHORT')
  )
  AND (
    coalesce(is_preschool, false) = false
    OR upper(coalesce(format, '')) IN ('TV', 'TV_SHORT')
  );

-- Re-evaluate existing rows so previously blocked-but-otherwise-eligible
-- unknown-origin and TV exceptions become visible under policy v3.
UPDATE public.anime
SET is_adult = coalesce(is_adult, false)
WHERE catalog_policy_decision IS DISTINCT FROM 'exclude'
   OR anime_verification_status IS DISTINCT FROM 'verified'
   OR catalog_policy_version IS DISTINCT FROM 'v3';
