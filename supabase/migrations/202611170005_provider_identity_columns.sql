-- Stable provider identity columns for idempotent catalog imports.
alter table public.episodes add column if not exists source text, add column if not exists source_id text;
alter table public.people add column if not exists source text, add column if not exists source_id text;
alter table public.characters add column if not exists source text, add column if not exists source_id text;
alter table public.studios add column if not exists source text, add column if not exists source_id text;
alter table public.series add column if not exists source text, add column if not exists source_id text;
alter table public.organizations add column if not exists source text, add column if not exists source_id text;

create unique index if not exists episodes_source_source_id_unique_idx
  on public.episodes(source,source_id) where source is not null and source_id is not null;
create unique index if not exists people_source_source_id_unique_idx
  on public.people(source,source_id) where source is not null and source_id is not null;
create unique index if not exists characters_source_source_id_unique_idx
  on public.characters(source,source_id) where source is not null and source_id is not null;
create unique index if not exists studios_source_source_id_unique_idx
  on public.studios(source,source_id) where source is not null and source_id is not null;
create unique index if not exists series_source_source_id_unique_idx
  on public.series(source,source_id) where source is not null and source_id is not null;
create unique index if not exists organizations_source_source_id_unique_idx
  on public.organizations(source,source_id) where source is not null and source_id is not null;
