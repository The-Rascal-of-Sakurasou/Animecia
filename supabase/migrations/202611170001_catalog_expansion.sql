-- ANIXIA catalog expansion (additive; preserves existing tables and rows)
-- Generated 2026-11-17. Apply only after reviewing the matching Git commit.

create table if not exists public.anime_titles (
  id uuid primary key default gen_random_uuid(),
  anime_id uuid not null references public.anime(id) on delete cascade,
  title text not null,
  language_code text not null default 'ja',
  title_type text not null default 'synonym',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint anime_titles_language_code_chk check (language_code ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
  constraint anime_titles_type_chk check (title_type in ('official','main','english','japanese','kana','romaji','synonym','short')),
  constraint anime_titles_title_nonempty_chk check (length(btrim(title)) > 0)
);

create unique index if not exists anime_titles_dedupe_idx
  on public.anime_titles (anime_id, language_code, title_type, lower(title));
create index if not exists anime_titles_title_lower_idx
  on public.anime_titles (lower(title));

create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  anime_id uuid not null references public.anime(id) on delete cascade,
  episode_number text,
  episode_order integer not null,
  episode_kind text not null default 'regular',
  title text,
  title_ja text,
  synopsis text,
  aired_at date,
  duration_seconds integer,
  is_published boolean not null default false,
  source_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint episodes_order_positive_chk check (episode_order > 0),
  constraint episodes_kind_chk check (episode_kind in ('regular','special','recap','trailer','unknown')),
  constraint episodes_duration_chk check (duration_seconds is null or duration_seconds > 0),
  constraint episodes_number_nonempty_chk check (episode_number is null or length(btrim(episode_number)) > 0),
  constraint episodes_anime_order_key unique (anime_id, episode_order)
);
create index if not exists episodes_anime_aired_idx on public.episodes (anime_id, aired_at, episode_order);
create index if not exists episodes_anime_published_idx on public.episodes (anime_id, episode_order) where is_published = true;

create table if not exists public.anime_studios (
  anime_id uuid not null references public.anime(id) on delete cascade,
  studio_id uuid not null references public.studios(id) on delete restrict,
  production_role text not null default 'animation',
  display_order integer not null default 1,
  primary key (anime_id, studio_id, production_role),
  constraint anime_studios_role_chk check (production_role in ('animation','production','planning','cooperation','other')),
  constraint anime_studios_order_chk check (display_order > 0)
);
create index if not exists anime_studios_studio_idx on public.anime_studios (studio_id, anime_id);

create table if not exists public.anime_relations (
  anime_id uuid not null references public.anime(id) on delete cascade,
  related_anime_id uuid not null references public.anime(id) on delete cascade,
  relation_type text not null,
  display_order integer not null default 1,
  notes text,
  created_at timestamptz not null default now(),
  primary key (anime_id, related_anime_id, relation_type),
  constraint anime_relations_not_self_chk check (anime_id <> related_anime_id),
  constraint anime_relations_type_chk check (relation_type in ('sequel','prequel','side_story','spin_off','alternative_version','summary','parent_story','adaptation','other')),
  constraint anime_relations_order_chk check (display_order > 0)
);
create index if not exists anime_relations_related_idx on public.anime_relations (related_anime_id, relation_type);

create table if not exists public.anime_external_ids (
  id uuid primary key default gen_random_uuid(),
  anime_id uuid not null references public.anime(id) on delete cascade,
  source text not null,
  external_id text not null,
  source_url text,
  is_primary boolean not null default false,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint anime_external_source_nonempty_chk check (length(btrim(source)) > 0),
  constraint anime_external_id_nonempty_chk check (length(btrim(external_id)) > 0),
  constraint anime_external_source_id_key unique (source, external_id),
  constraint anime_external_anime_source_key unique (anime_id, source)
);
create index if not exists anime_external_anime_idx on public.anime_external_ids (anime_id);

create table if not exists public.episode_external_ids (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete cascade,
  source text not null,
  external_id text not null,
  source_url text,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint episode_external_source_id_key unique (source, external_id),
  constraint episode_external_id_nonempty_chk check (length(btrim(external_id)) > 0)
);
create index if not exists episode_external_episode_idx on public.episode_external_ids (episode_id);

create table if not exists public.people_external_ids (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  source text not null,
  external_id text not null,
  source_url text,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint people_external_source_id_key unique (source, external_id),
  constraint people_external_person_source_key unique (person_id, source)
);
create index if not exists people_external_person_idx on public.people_external_ids (person_id);

create table if not exists public.character_external_ids (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  source text not null,
  external_id text not null,
  source_url text,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint character_external_source_id_key unique (source, external_id),
  constraint character_external_character_source_key unique (character_id, source)
);
create index if not exists character_external_character_idx on public.character_external_ids (character_id);

create table if not exists public.studio_external_ids (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  source text not null,
  external_id text not null,
  source_url text,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint studio_external_source_id_key unique (source, external_id),
  constraint studio_external_studio_source_key unique (studio_id, source)
);
create index if not exists studio_external_studio_idx on public.studio_external_ids (studio_id);

create table if not exists public.catalog_sources (
  code text primary key,
  display_name text not null,
  website_url text,
  api_docs_url text,
  terms_url text,
  rights_review_status text not null default 'pending',
  rights_reviewed_at timestamptz,
  rights_notes text,
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_sources_review_status_chk check (rights_review_status in ('pending','approved','restricted','rejected'))
);

-- A source registry entry is metadata only; source payloads and third-party images are not copied here.
insert into public.catalog_sources (code, display_name, website_url, api_docs_url, terms_url, rights_review_status, is_enabled)
values ('annict','Annict','https://annict.com/','https://developers.annict.com/docs/rest-api/v1','https://annict.com/terms/api','pending',false)
on conflict (code) do nothing;

-- Backfill the current single-source columns into the normalized cross-reference table.
-- No source content is copied; only identifiers and the source URL are recorded.
insert into public.anime_external_ids (anime_id, source, external_id, source_url)
select id, source, source_id, null
from public.anime
where source is not null and source_id is not null and length(btrim(source_id)) > 0
on conflict (source, external_id) do nothing;

-- Enable RLS on all newly introduced catalog tables.
alter table public.anime_titles enable row level security;
alter table public.episodes enable row level security;
alter table public.anime_studios enable row level security;
alter table public.anime_relations enable row level security;
alter table public.anime_external_ids enable row level security;
alter table public.episode_external_ids enable row level security;
alter table public.people_external_ids enable row level security;
alter table public.character_external_ids enable row level security;
alter table public.studio_external_ids enable row level security;
alter table public.catalog_sources enable row level security;

-- Public reads are limited to published works. All writes require an ANIXIA admin.
drop policy if exists "Published anime titles are readable" on public.anime_titles;
create policy "Published anime titles are readable" on public.anime_titles
for select to anon, authenticated
using (private.is_published_anime(anime_id));

drop policy if exists "ANIXIA admins manage anime titles" on public.anime_titles;
create policy "ANIXIA admins manage anime titles" on public.anime_titles
for all to authenticated
using (private.is_anixia_admin())
with check (private.is_anixia_admin());

drop policy if exists "Episodes of published anime are readable" on public.episodes;
create policy "Episodes of published anime are readable" on public.episodes
for select to anon, authenticated
using (is_published = true and private.is_published_anime(anime_id));

drop policy if exists "ANIXIA admins manage episodes" on public.episodes;
create policy "ANIXIA admins manage episodes" on public.episodes
for all to authenticated
using (private.is_anixia_admin())
with check (private.is_anixia_admin());

drop policy if exists "Studios of published anime are readable" on public.anime_studios;
create policy "Studios of published anime are readable" on public.anime_studios
for select to anon, authenticated
using (private.is_published_anime(anime_id));

drop policy if exists "ANIXIA admins manage anime studios" on public.anime_studios;
create policy "ANIXIA admins manage anime studios" on public.anime_studios
for all to authenticated
using (private.is_anixia_admin())
with check (private.is_anixia_admin());

drop policy if exists "Relations between published anime are readable" on public.anime_relations;
create policy "Relations between published anime are readable" on public.anime_relations
for select to anon, authenticated
using (private.is_published_anime(anime_id) and private.is_published_anime(related_anime_id));

drop policy if exists "ANIXIA admins manage anime relations" on public.anime_relations;
create policy "ANIXIA admins manage anime relations" on public.anime_relations
for all to authenticated
using (private.is_anixia_admin())
with check (private.is_anixia_admin());

-- External source identifiers and source licensing notes are admin-only.
drop policy if exists "ANIXIA admins manage anime external ids" on public.anime_external_ids;
create policy "ANIXIA admins manage anime external ids" on public.anime_external_ids
for all to authenticated using (private.is_anixia_admin()) with check (private.is_anixia_admin());

drop policy if exists "ANIXIA admins manage episode external ids" on public.episode_external_ids;
create policy "ANIXIA admins manage episode external ids" on public.episode_external_ids
for all to authenticated using (private.is_anixia_admin()) with check (private.is_anixia_admin());

drop policy if exists "ANIXIA admins manage people external ids" on public.people_external_ids;
create policy "ANIXIA admins manage people external ids" on public.people_external_ids
for all to authenticated using (private.is_anixia_admin()) with check (private.is_anixia_admin());

drop policy if exists "ANIXIA admins manage character external ids" on public.character_external_ids;
create policy "ANIXIA admins manage character external ids" on public.character_external_ids
for all to authenticated using (private.is_anixia_admin()) with check (private.is_anixia_admin());

drop policy if exists "ANIXIA admins manage studio external ids" on public.studio_external_ids;
create policy "ANIXIA admins manage studio external ids" on public.studio_external_ids
for all to authenticated using (private.is_anixia_admin()) with check (private.is_anixia_admin());

drop policy if exists "ANIXIA admins manage catalog sources" on public.catalog_sources;
create policy "ANIXIA admins manage catalog sources" on public.catalog_sources
for all to authenticated using (private.is_anixia_admin()) with check (private.is_anixia_admin());

-- Explicit API privileges; RLS still restricts rows and operations.
grant select on public.anime_titles, public.episodes, public.anime_studios, public.anime_relations to anon, authenticated;
grant insert, update, delete on public.anime_titles, public.episodes, public.anime_studios, public.anime_relations to authenticated;
grant select, insert, update, delete on public.anime_external_ids, public.episode_external_ids, public.people_external_ids, public.character_external_ids, public.studio_external_ids, public.catalog_sources to authenticated;
grant all on public.anime_titles, public.episodes, public.anime_studios, public.anime_relations, public.anime_external_ids, public.episode_external_ids, public.people_external_ids, public.character_external_ids, public.studio_external_ids, public.catalog_sources to service_role;

-- Existing source/source_id pair is now protected against duplicate imports.
create unique index if not exists anime_source_source_id_unique_idx
  on public.anime (source, source_id)
  where source is not null and source_id is not null;
