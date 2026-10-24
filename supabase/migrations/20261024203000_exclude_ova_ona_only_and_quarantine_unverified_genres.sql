-- Animecia catalog cleanup — 2026-10-24.
-- This migration is safe to rerun. Original anime rows are retained.

-- Remove standalone OVA/OAV/ONA entries from the public catalog unless the same
-- normalized Japanese/title field exists as a TV, TV_SHORT, or MOVIE record.
-- Exact-title matching is intentionally conservative because anime_relations is empty.
UPDATE public.anime a
SET catalog_policy_decision='exclude',
    catalog_policy_reasons=CASE
      WHEN 'excluded_ova_ona_standalone_by_user_request'=ANY(COALESCE(a.catalog_policy_reasons,ARRAY[]::text[]))
      THEN COALESCE(a.catalog_policy_reasons,ARRAY[]::text[])
      ELSE array_append(COALESCE(a.catalog_policy_reasons,ARRAY[]::text[]),'excluded_ova_ona_standalone_by_user_request')
    END,
    catalog_policy_version='v3',
    catalog_policy_checked_at=now()
WHERE a.anime_verification_status='verified'
  AND COALESCE(a.catalog_policy_decision,'include') <> 'exclude'
  AND upper(COALESCE(a.format,'')) IN ('OVA','OAV','ONA')
  AND NOT EXISTS (
    SELECT 1 FROM public.anime other
    WHERE other.id <> a.id
      AND lower(regexp_replace(btrim(other.title),'[[:space:]　]+','','g')) =
          lower(regexp_replace(btrim(a.title),'[[:space:]　]+','','g'))
      AND length(btrim(COALESCE(a.title,''))) >= 3
      AND other.anime_verification_status='verified'
      AND COALESCE(other.catalog_policy_decision,'include') <> 'exclude'
      AND COALESCE(other.duplicate_status,'unique')='unique'
      AND upper(COALESCE(other.format,'')) IN ('TV','TV_SHORT','MOVIE')
      AND other.start_date >= DATE '1963-01-01'
      AND COALESCE(other.is_adult,false)=false
      AND COALESCE(other.is_preschool,false)=false
      AND (upper(COALESCE(other.original_country_code,''))='JP'
           OR (other.original_country_code IS NULL AND COALESCE(other.original_country_status,'unknown') <> 'verified_non_jp'))
  );

-- The min-3 SQL genre repair was not source-grounded and assigned generic bundles
-- to unrelated works. Preserve the old value for audit and remove unsupported tags.
INSERT INTO public.animecia_public_genre_audit
  (anime_id,current_genre,classification_version,confidence,audit_status,audit_reason,proposed_genre,checked_at,created_at)
SELECT a.id,a.genre,a.genre_classification_version,a.genre_classification_confidence,
       'needs_review',
       'Unverified bulk SQL repair produced unsupported genre assignments; original value preserved here pending source-backed reclassification.',
       NULL,now(),now()
FROM public.anime a
WHERE a.anime_verification_status='verified'
  AND a.genre_classification_version='animecia-sql-repair-v1-min3'
ON CONFLICT (anime_id) DO UPDATE
SET current_genre=EXCLUDED.current_genre,
    classification_version=EXCLUDED.classification_version,
    confidence=EXCLUDED.confidence,
    audit_status='needs_review',
    audit_reason=EXCLUDED.audit_reason,
    proposed_genre=NULL,
    checked_at=now();

DELETE FROM public.anime_genres ag
USING public.anime a
WHERE ag.anime_id=a.id
  AND a.anime_verification_status='verified'
  AND a.genre_classification_version='animecia-sql-repair-v1-min3';

UPDATE public.anime
SET genre=NULL,
    genre_classification_version='needs-source-reclassification-v1',
    genre_classification_confidence=NULL,
    genre_classification_reasons=array_append(COALESCE(genre_classification_reasons,ARRAY[]::text[]),
      'Previous classification was an unsupported bulk SQL repair; original value preserved in animecia_public_genre_audit pending source-backed reclassification.'),
    genre_classified_at=now()
WHERE anime_verification_status='verified'
  AND genre_classification_version='animecia-sql-repair-v1-min3';
