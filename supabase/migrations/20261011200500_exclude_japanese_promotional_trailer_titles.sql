CREATE OR REPLACE FUNCTION public.recalculate_anime_catalog_policy()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  reasons text[] := ARRAY[]::text[];
  fmt text := upper(coalesce(new.format, ''));
  country_status text := coalesce(new.original_country_status, 'unknown');
  title_blob text := concat_ws(
    ' ', new.title, new.title_japanese, new.title_native, new.title_english,
    new.title_romaji, new.english_title, new.title_user_preferred
  );
  source_type text := coalesce(new.source_metadata->>'type', '');
BEGIN
  new.catalog_policy_version := 'v5';
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

  IF title_blob ~* '(^|[[:space:]【(（])PV([[:space:]】)）]|$)|PV$|ＰＶ|(^|[[:space:]【(（])CM([[:space:]】)）]|$)|CM$|ＣＭ|trailer|teaser|promotional[[:space:]-]+video|advertisement|commercial|トレーラー|予告編|予告映像|ティザー映像|ティーザー映像|宣伝映像|広告動画|特報'
     OR source_type ~* 'trailer|teaser|promotional|advertisement|commercial|(^|[[:space:]])PV([[:space:]]|$)|(^|[[:space:]])CM([[:space:]]|$)' THEN
    reasons := array_append(reasons, 'promotional_media');
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

-- Re-evaluate only verified records with common Japanese/English trailer markers.
UPDATE public.anime
SET title = title
WHERE anime_verification_status = 'verified'
  AND concat_ws(' ', title, title_japanese, title_native, title_english, title_romaji, english_title, title_user_preferred)
      ~* 'ＰＶ|ＣＭ|trailer|teaser|promotional[[:space:]-]+video|advertisement|commercial|トレーラー|予告編|予告映像|ティザー映像|ティーザー映像|宣伝映像|広告動画|特報';