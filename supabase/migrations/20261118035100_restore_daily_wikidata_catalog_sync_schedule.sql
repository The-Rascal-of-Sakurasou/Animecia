-- Restore the daily Wikidata work-catalog importer.
-- The original schedule was missing from cron.job even though the function and
-- sync state remained active. Keep the credential in Vault; never expose it.
do $$
declare
  existing_job record;
begin
  for existing_job in
    select jobid from cron.job where jobname = 'anixia-wikidata-catalog-sync'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;

  perform cron.schedule(
    'anixia-wikidata-catalog-sync',
    '30 2 * * *',
    $job$
    select net.http_post(
      url := 'https://trvnxggqzlhqdhoyiliy.supabase.co/functions/v1/sync-wikidata-catalog',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-anixia-cron-token',
        (select decrypted_secret from vault.decrypted_secrets where name = 'anixia_wikidata_sync_token' limit 1)
      ),
      body := jsonb_build_object('mode', 'sync', 'source', 'cron', 'limit', 50),
      timeout_milliseconds := 60000
    ) as request_id;
    $job$
  );
end $$;
