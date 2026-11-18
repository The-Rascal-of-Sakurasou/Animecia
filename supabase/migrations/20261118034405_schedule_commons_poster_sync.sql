select cron.schedule(
  'anixia-commons-poster-sync',
  '0 5 * * 0',
  $job$
  select net.http_post(
    url := 'https://trvnxggqzlhqdhoyiliy.supabase.co/functions/v1/sync-commons-posters',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-anixia-cron-token',
      (select decrypted_secret from vault.decrypted_secrets where name = 'anixia_wikidata_sync_token' limit 1)
    ),
    body := jsonb_build_object('limit', 10, 'force', false),
    timeout_milliseconds := 60000
  );
  $job$
);