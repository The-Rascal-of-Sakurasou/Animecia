-- Wikipedia synopsis provenance, public attribution, and scheduled sync.
ALTER TABLE public.anime
  ADD COLUMN IF NOT EXISTS synopsis_source text,
  ADD COLUMN IF NOT EXISTS synopsis_source_title text,
  ADD COLUMN IF NOT EXISTS synopsis_source_url text,
  ADD COLUMN IF NOT EXISTS synopsis_source_revision_id bigint,
  ADD COLUMN IF NOT EXISTS synopsis_source_revision_url text,
  ADD COLUMN IF NOT EXISTS synopsis_license text,
  ADD COLUMN IF NOT EXISTS synopsis_license_url text,
  ADD COLUMN IF NOT EXISTS synopsis_attribution text,
  ADD COLUMN IF NOT EXISTS synopsis_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS synopsis_attempted_at timestamptz;

CREATE INDEX IF NOT EXISTS anime_synopsis_pending_idx
ON public.anime (synopsis_attempted_at NULLS FIRST, release_year DESC NULLS LAST)
WHERE is_published = true AND synopsis IS NULL;

INSERT INTO public.catalog_sources
  (code, display_name, website_url, api_docs_url, terms_url, rights_review_status, rights_notes, is_enabled)
VALUES
  ('japanese_wikipedia', 'Japanese Wikipedia', 'https://ja.wikipedia.org/',
   'https://www.mediawiki.org/wiki/API:REST_API/Reference/ja',
   'https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use',
   'pending',
   'Article prose extraction is disabled. ANIXIA does not copy Wikipedia article text; only non-prose structured metadata from approved sources is used.',
   false)
ON CONFLICT (code) DO NOTHING;

DO $$
DECLARE
  definition text;
BEGIN
  definition := pg_get_functiondef('public.get_public_anime_detail(uuid)'::regprocedure);
  definition := replace(
    definition,
    $needle$'synopsis', a.synopsis, 'synopsis_en', a.synopsis_en,$needle$,
    $replacement$'synopsis', a.synopsis, 'synopsis_en', a.synopsis_en,
    'synopsis_source', a.synopsis_source,
    'synopsis_source_title', a.synopsis_source_title,
    'synopsis_source_url', a.synopsis_source_url,
    'synopsis_source_revision_id', a.synopsis_source_revision_id,
    'synopsis_source_revision_url', a.synopsis_source_revision_url,
    'synopsis_license', a.synopsis_license,
    'synopsis_license_url', a.synopsis_license_url,
    'synopsis_attribution', a.synopsis_attribution,
    'synopsis_synced_at', a.synopsis_synced_at,$replacement$
  );
  IF position('synopsis_source_revision_url' in definition) = 0 THEN
    RAISE EXCEPTION 'Could not safely extend get_public_anime_detail';
  END IF;
  EXECUTE definition;
END $$;
