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