create table if not exists public.genre_external_ids (
  id uuid primary key default gen_random_uuid(),
  genre_id uuid not null references public.genres(id) on delete cascade,
  source text not null,
  external_id text not null,
  source_url text,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint genre_external_ids_source_external_key unique (source, external_id),
  constraint genre_external_ids_genre_source_key unique (genre_id, source)
);

alter table public.genre_external_ids enable row level security;
revoke all on table public.genre_external_ids from anon, authenticated;
grant all on table public.genre_external_ids to service_role;

select cron.schedule(
  'anixia-wikidata-enrichment-sync',
  '15 3 * * *',
  $job$
  select net.http_post(
    url := 'https://trvnxggqzlhqdhoyiliy.supabase.co/functions/v1/sync-wikidata-enrichment',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-anixia-cron-token',
      (select decrypted_secret from vault.decrypted_secrets where name = 'anixia_wikidata_sync_token' limit 1)
    ),
    body := jsonb_build_object('mode', 'sync', 'limit', 200),
    timeout_milliseconds := 60000
  );
  $job$
);