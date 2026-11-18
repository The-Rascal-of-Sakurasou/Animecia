CREATE OR REPLACE FUNCTION private.enforce_admin_publication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  service_role_request boolean :=
    current_setting('request.jwt.claim.role', true) = 'service_role';
  qualified_wikidata boolean :=
    NEW.source = 'wikidata'
    AND NEW.source_id ~ '^Q[1-9][0-9]*$'
    AND COALESCE(btrim(NEW.title), '') <> ''
    AND COALESCE(btrim(NEW.title_ja), '') <> ''
    AND NEW.release_year >= 1963
    AND NEW.country_code = 'JP'
    AND NEW.format IN ('tv', 'movie', 'ova', 'web');
BEGIN
  IF NEW.is_published IS TRUE THEN
    IF TG_OP = 'INSERT' THEN
      IF NOT private.is_anixia_admin()
         AND NOT (service_role_request AND qualified_wikidata) THEN
        RAISE EXCEPTION 'Publishing catalog records requires administrator review.'
          USING errcode = '42501';
      END IF;
    ELSIF OLD.is_published IS DISTINCT FROM TRUE THEN
      IF NOT private.is_anixia_admin()
         AND NOT (service_role_request AND qualified_wikidata) THEN
        RAISE EXCEPTION 'Publishing catalog records requires administrator review.'
          USING errcode = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Backfill only deterministic, Japanese-titled Wikidata records. The
-- transaction-local claim mirrors the trusted service-role Edge Function path.
SELECT set_config('request.jwt.claim.role', 'service_role', true);

UPDATE public.anime
SET is_published = true,
    updated_at = now()
WHERE source = 'wikidata'
  AND source_id ~ '^Q[1-9][0-9]*$'
  AND title IS NOT NULL AND btrim(title) <> ''
  AND title_ja IS NOT NULL AND btrim(title_ja) <> ''
  AND release_year >= 1963
  AND country_code = 'JP'
  AND format IN ('tv', 'movie', 'ova', 'web')
  AND is_published IS DISTINCT FROM true;

INSERT INTO public.catalog_sync_state (source, next_offset, updated_at)
VALUES ('wikidata-enrichment', 0, now())
ON CONFLICT (source) DO NOTHING;

DO $anixia$
DECLARE existing_job record;
BEGIN
  FOR existing_job IN
    SELECT jobid FROM cron.job WHERE jobname = 'anixia-wikidata-episodes-sync'
  LOOP
    PERFORM cron.unschedule(existing_job.jobid);
  END LOOP;

  PERFORM cron.schedule(
    'anixia-wikidata-episodes-sync',
    '0 4 * * *',
    $job$SELECT net.http_post(
      url := 'https://trvnxggqzlhqdhoyiliy.supabase.co/functions/v1/sync-wikidata-episodes',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-anixia-cron-token', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anixia_wikidata_sync_token' LIMIT 1)
      ),
      body := jsonb_build_object('mode', 'sync', 'limit', 20),
      timeout_milliseconds := 120000
    );$job$
  );
END
$anixia$;