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
  (code, display_name, website_url, api_docs_url, terms_url, rights_review_status, rights_reviewed_at, rights_notes, is_enabled)
VALUES
  ('japanese_wikipedia', 'Japanese Wikipedia (CC BY-SA 4.0)', 'https://ja.wikipedia.org/',
   'https://www.mediawiki.org/wiki/API:REST_API/Reference/ja',
   'https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use',
   'approved', now(),
   'Imports only exact-title Japanese Wikipedia lead extracts. Stores the article URL, exact revision URL and ID, license URL, and contributor attribution, and displays them on the anime detail page. Disambiguation pages, missing/short/long extracts, and title mismatches are skipped. Article-specific third-party notices must be respected; do not import restricted material.',
   true)
ON CONFLICT (code) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  website_url = EXCLUDED.website_url,
  api_docs_url = EXCLUDED.api_docs_url,
  terms_url = EXCLUDED.terms_url,
  rights_review_status = 'approved',
  rights_reviewed_at = now(),
  rights_notes = EXCLUDED.rights_notes,
  is_enabled = true,
  updated_at = now();

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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'anixia-wikipedia-synopsis-sync') THEN
    PERFORM cron.schedule(
      'anixia-wikipedia-synopsis-sync',
      '30 4 * * *',
      $job$
      SELECT net.http_post(
        url := 'https://trvnxggqzlhqdhoyiliy.supabase.co/functions/v1/sync-wikipedia-synopses',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-anixia-cron-token',
          (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anixia_wikidata_sync_token' LIMIT 1)
        ),
        body := jsonb_build_object('limit', 10),
        timeout_milliseconds := 120000
      );
      $job$
    );
  END IF;
END $$;
