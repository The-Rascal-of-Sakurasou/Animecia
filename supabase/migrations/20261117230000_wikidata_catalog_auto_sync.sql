-- ANIXIA Wikidata catalog synchronization state and private cron-token hash.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create table if not exists public.catalog_sync_secrets (
  id smallint primary key default 1 check (id = 1),
  secret_hash text not null,
  updated_at timestamptz not null default now()
);
alter table public.catalog_sync_secrets enable row level security;
revoke all on public.catalog_sync_secrets from anon, authenticated;
grant all on public.catalog_sync_secrets to service_role;

create table if not exists public.catalog_sync_state (
  source text primary key,
  next_offset integer not null default 0 check (next_offset >= 0),
  last_success_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.catalog_sync_state enable row level security;
revoke all on public.catalog_sync_state from anon, authenticated;
grant all on public.catalog_sync_state to service_role;

insert into public.catalog_sync_state (source, next_offset)
values ('wikidata', 0)
on conflict (source) do nothing;
