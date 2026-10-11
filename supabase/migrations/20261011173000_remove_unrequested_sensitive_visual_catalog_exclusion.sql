-- Align catalog eligibility with the user's explicit Animecia policy.
-- A sensitive-visual flag alone is not an exclusion criterion; adult non-broadcast
-- works remain excluded by is_adult, while TV/TV_SHORT exceptions remain eligible.
CREATE OR REPLACE FUNCTION public.recalculate_anime_catalog_policy()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  reasons text[] := ARRAY[]::text[];
  fmt text := upper(coalesce(new.format, ''));
  country_status text := coalesce(new.original_country_status, 'unknown');
  title_blob text := concat_ws(' ', new.title, new.title_japanese, new.title_native,
    new.title_english, new.title_romaji, new.english_title, new.title_user_preferred);
BEGIN
  new.catalog_policy_version := 'v4';
  new.catalog_policy_checked_at := now();

  IF new.start_date IS NULL THEN
    reasons := array_append(reasons, 'unknown_first_release_date');
  ELSIF new.start_date < DATE '1963-01-01' THEN
    reasons := array_append(reasons, 'before_1963-01-01');
  END IF;

  IF fmt NOT IN ('TV', 'TV_SHORT', 'MOVIE', 'OVA', 'OAV', 'ONA', 'SPECIAL') THEN
    reasons := array_append(reasons, 'not_general_anime_format');
  END IF;

  IF title_blob ~* '(^|[[:space:]【(（])PV([[:space:]】)）]|$)|(^|[[:space:]【(（])CM([[:space:]】)）]|$)|trailer|teaser|promotional[[:space:]-]+video|advertisement|commercial|予告編|予告映像|ティザー映像|ティーザー映像|宣伝映像|広告動画|特報'
     OR coalesce(new.source_metadata->>'type', '') ~* 'trailer|teaser|promotional|advertisement|commercial|(^|[[:space:]])PV([[:space:]]|$)|(^|[[:space:]])CM([[:space:]]|$)' THEN
    reasons := array_append(reasons, 'promotional_or_preview_media');
  END IF;

  IF country_status = 'verified_non_jp' THEN
    reasons := array_append(reasons, 'non_japanese_original');
  END IF;

  IF coalesce(new.is_adult, false) AND fmt NOT IN ('TV', 'TV_SHORT') THEN
    reasons := array_append(reasons, 'adult_non_broadcast');
  END IF;

  IF coalesce(new.is_preschool, false) AND fmt NOT IN ('TV', 'TV_SHORT') THEN
    reasons := array_append(reasons, 'preschool_non_broadcast');
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

CREATE OR REPLACE VIEW public.animecia_public_anime AS
SELECT
  id, title, genre, description, review, official_url, english_title, recommended,
  recommended_start_at, recommended_end_at, external_id, title_romaji, title_english,
  title_native, title_japanese, cover_image, banner_image, start_date, end_date,
  episodes, duration, status, format, season, season_year, source, average_score,
  popularity, favourites_count, site_url, updated_at, created_at, title_user_preferred,
  anime_verification_status, anime_verification_confidence, anime_verification_reasons,
  search_aliases, streaming_links, genres_synced_at, source_provider, source_id,
  original_source, original_title, original_authors, source_metadata, synopsis,
  synopsis_source, synopsis_updated_at, genre_classified_at, genre_classification_version,
  genre_classification_confidence, genre_classification_reasons, subgenre_classification_version,
  subgenres_classified_at, start_date_precision, season_source, data_source_updated_at,
  is_adult, is_kids, is_sensitive_visual, is_japanese, duplicate_status, duplicate_of_id,
  duplicate_group_key, duplicate_review_reason, is_preschool, original_country_code,
  original_country_status, catalog_policy_decision, catalog_policy_reasons, catalog_policy_version
FROM public.anime a
WHERE anime_verification_status = 'verified'
  AND COALESCE(catalog_policy_decision, 'include') <> 'exclude'
  AND COALESCE(duplicate_status, 'unique') = 'unique'
  AND COALESCE(original_country_status, 'unknown') <> 'verified_non_jp'
  AND start_date IS NOT NULL
  AND start_date >= DATE '1963-01-01'
  AND upper(COALESCE(format, '')) = ANY (ARRAY['TV','TV_SHORT','MOVIE','OVA','OAV','ONA','SPECIAL'])
  AND (COALESCE(is_adult, false) = false OR upper(COALESCE(format, '')) = ANY (ARRAY['TV','TV_SHORT']))
  AND (COALESCE(is_preschool, false) = false OR upper(COALESCE(format, '')) = ANY (ARRAY['TV','TV_SHORT']))
  AND NOT (
    concat_ws(' ', title, title_japanese, title_native, title_english, title_romaji, english_title, title_user_preferred)
      ~* '(^|[[:space:]【(（])PV([[:space:]】)）]|$)|(^|[[:space:]【(（])CM([[:space:]】)）]|$)|trailer|teaser|promotional[[:space:]-]+video|advertisement|commercial|予告編|予告映像|ティザー映像|ティーザー映像|宣伝映像|広告動画|特報'
    OR COALESCE(source_metadata->>'type', '')
      ~* 'trailer|teaser|promotional|advertisement|commercial|(^|[[:space:]])PV([[:space:]]|$)|(^|[[:space:]])CM([[:space:]]|$)'
  );

-- Re-evaluate only records previously excluded for this unrequested flag.
UPDATE public.anime
SET is_sensitive_visual = COALESCE(is_sensitive_visual, false)
WHERE COALESCE(is_sensitive_visual, false) = true
  AND catalog_policy_reasons @> ARRAY['sensitive_visual_manual_review']::text[];