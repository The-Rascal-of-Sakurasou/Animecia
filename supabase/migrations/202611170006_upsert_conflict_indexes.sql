-- PostgREST upsert conflict targets require an inferable non-partial unique index.
-- NULL values remain allowed and do not collide in PostgreSQL unique indexes.
create unique index if not exists anime_source_source_id_upsert_key
  on public.anime (source, source_id);
create unique index if not exists episodes_source_source_id_upsert_key
  on public.episodes (source, source_id);
create unique index if not exists people_source_source_id_upsert_key
  on public.people (source, source_id);
create unique index if not exists characters_source_source_id_upsert_key
  on public.characters (source, source_id);
create unique index if not exists studios_source_source_id_upsert_key
  on public.studios (source, source_id);
create unique index if not exists series_source_source_id_upsert_key
  on public.series (source, source_id);
create unique index if not exists organizations_source_source_id_upsert_key
  on public.organizations (source, source_id);
