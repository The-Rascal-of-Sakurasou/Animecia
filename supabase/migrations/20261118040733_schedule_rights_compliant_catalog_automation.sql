do $$
declare
  j record;
begin
  for j in
    select jobid from cron.job
    where jobname in (
      'anixia-wikidata-catalog-sync',
      'anixia-wikidata-enrichment-sync',
      'anixia-seasonal-anime-sync',
      'anixia-wikidata-episodes-sync',
      'anixia-commons-poster-sync',
      'anixia-wikipedia-synopsis-sync'
    )
  loop
    perform cron.unschedule(j.jobid);
  end loop;
end $$;

update public.catalog_sources set is_enabled = true
where code in ('wikidata','wikimedia_commons');

update public.catalog_sources
set is_enabled = false, rights_review_status = 'pending'
where code in ('annict','japanese_wikipedia');

select cron.schedule(
  'anixia-wikidata-catalog-sync',
  '30 2 * * *',
  $job$ select net.http_post(
    url := 'https://trvnxggqzlhqdhoyiliy.supabase.co/functions/v1/sync-wikidata-catalog',
    headers := jsonb_build_object('Content-Type','application/json','x-anixia-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='anixia_wikidata_sync_token' limit 1)),
    body := jsonb_build_object('mode','sync','limit',50),
    timeout_milliseconds := 120000
  ); $job$
);

select cron.schedule(
  'anixia-wikidata-enrichment-sync',
  '15 3 * * *',
  $job$ select net.http_post(
    url := 'https://trvnxggqzlhqdhoyiliy.supabase.co/functions/v1/sync-wikidata-enrichment',
    headers := jsonb_build_object('Content-Type','application/json','x-anixia-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='anixia_wikidata_sync_token' limit 1)),
    body := jsonb_build_object('mode','sync','limit',50),
    timeout_milliseconds := 120000
  ); $job$
);

select cron.schedule(
  'anixia-seasonal-anime-sync',
  '35 3 * * *',
  $job$ select net.http_post(
    url := 'https://trvnxggqzlhqdhoyiliy.supabase.co/functions/v1/sync-seasonal-anime',
    headers := jsonb_build_object('Content-Type','application/json','x-anixia-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='anixia_wikidata_sync_token' limit 1)),
    body := jsonb_build_object('mode','sync','limit',50),
    timeout_milliseconds := 120000
  ); $job$
);

select cron.schedule(
  'anixia-wikidata-episodes-sync',
  '0 4 * * *',
  $job$ select net.http_post(
    url := 'https://trvnxggqzlhqdhoyiliy.supabase.co/functions/v1/sync-wikidata-episodes',
    headers := jsonb_build_object('Content-Type','application/json','x-anixia-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='anixia_wikidata_sync_token' limit 1)),
    body := jsonb_build_object('mode','sync','limit',20),
    timeout_milliseconds := 120000
  ); $job$
);

select cron.schedule(
  'anixia-commons-poster-sync',
  '0 5 * * 0',
  $job$ select net.http_post(
    url := 'https://trvnxggqzlhqdhoyiliy.supabase.co/functions/v1/sync-commons-posters',
    headers := jsonb_build_object('Content-Type','application/json','x-anixia-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='anixia_wikidata_sync_token' limit 1)),
    body := jsonb_build_object('limit',10,'force',false),
    timeout_milliseconds := 120000
  ); $job$
);