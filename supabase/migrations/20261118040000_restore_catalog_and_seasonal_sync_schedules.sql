DO $anixia$
DECLARE
  existing_job record;
BEGIN
  FOR existing_job IN
    SELECT jobid FROM cron.job
    WHERE jobname IN (
      'anixia-wikidata-catalog-sync',
      'anixia-wikidata-enrichment-sync',
      'anixia-wikidata-episodes-sync',
      'anixia-commons-poster-sync',
      'anixia-seasonal-anime-sync'
    )
  LOOP
    PERFORM cron.unschedule(existing_job.jobid);
  END LOOP;

  PERFORM cron.schedule(
    'anixia-wikidata-catalog-sync',
    '30 2 * * *',
    $job$SELECT net.http_post(
      url := 'https://trvnxggqzlhqdhoyiliy.supabase.co/functions/v1/sync-wikidata-catalog',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-anixia-cron-token', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anixia_wikidata_sync_token' LIMIT 1)
      ),
      body := jsonb_build_object('mode', 'sync', 'source', 'cron', 'limit', 50),
      timeout_milliseconds := 60000
    );$job$
  );

  PERFORM cron.schedule(
    'anixia-wikidata-enrichment-sync',
    '15 3 * * *',
    $job$SELECT net.http_post(
      url := 'https://trvnxggqzlhqdhoyiliy.supabase.co/functions/v1/sync-wikidata-enrichment',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-anixia-cron-token', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anixia_wikidata_sync_token' LIMIT 1)
      ),
      body := jsonb_build_object('mode', 'sync', 'limit', 50),
      timeout_milliseconds := 120000
    );$job$
  );

  PERFORM cron.schedule(
    'anixia-seasonal-anime-sync',
    '35 3 * * *',
    $job$SELECT net.http_post(
      url := 'https://trvnxggqzlhqdhoyiliy.supabase.co/functions/v1/sync-seasonal-anime',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-anixia-cron-token', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anixia_wikidata_sync_token' LIMIT 1)
      ),
      body := jsonb_build_object('mode', 'sync'),
      timeout_milliseconds := 120000
    );$job$
  );

  PERFORM cron.schedule(
    'anixia-wikidata-episodes-sync',
    '0 4 * * 0',
    $job$SELECT net.http_post(
      url := 'https://trvnxggqzlhqdhoyiliy.supabase.co/functions/v1/sync-wikidata-episodes',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-anixia-cron-token', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anixia_wikidata_sync_token' LIMIT 1)
      ),
      body := jsonb_build_object('mode', 'sync', 'limit', 5),
      timeout_milliseconds := 120000
    );$job$
  );

  PERFORM cron.schedule(
    'anixia-commons-poster-sync',
    '0 5 * * 0',
    $job$SELECT net.http_post(
      url := 'https://trvnxggqzlhqdhoyiliy.supabase.co/functions/v1/sync-commons-posters',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-anixia-cron-token', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anixia_wikidata_sync_token' LIMIT 1)
      ),
      body := jsonb_build_object('mode', 'sync'),
      timeout_milliseconds := 120000
    );$job$
  );
END
$anixia$;