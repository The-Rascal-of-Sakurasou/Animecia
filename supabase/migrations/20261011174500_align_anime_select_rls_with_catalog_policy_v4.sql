-- Align direct reads of public.anime with the canonical public catalog policy.
-- The public view and catalog RPCs use the same conditions; keep the base-table
-- SELECT policy consistent so direct client queries do not apply older exclusions.
DROP POLICY IF EXISTS "Public verified anime catalog" ON public.anime;
DROP POLICY IF EXISTS anime_catalog_select ON public.anime;

CREATE POLICY anime_catalog_select
ON public.anime
FOR SELECT
TO anon, authenticated
USING (
  anime_verification_status = 'verified'
  AND COALESCE(duplicate_status, 'unique') = 'unique'
  AND (
    original_country_code = 'JP'
    OR (
      original_country_code IS NULL
      AND COALESCE(original_country_status, 'unknown') <> 'verified_non_jp'
    )
  )
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
  )
);