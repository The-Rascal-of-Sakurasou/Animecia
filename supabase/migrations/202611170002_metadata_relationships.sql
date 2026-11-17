-- ANIXIA metadata and relationship expansion (additive)
-- Extends existing person/studio records without deleting or renaming existing columns.

alter table public.people
  add column if not exists name_kana text,
  add column if not exists name_en text,
  add column if not exists nickname text,
  add column if not exists nickname_en text,
  add column if not exists official_url text,
  add column if not exists wikipedia_url text,
  add column if not exists birthday text;

alter table public.characters
  add column if not exists name_kana text,
  add column if not exists name_en text,
  add column if not exists nickname text,
  add column if not exists nickname_en text,
  add column if not exists description_en text,
  add column if not exists series_id uuid;

alter table public.studios
  add column if not exists name_kana text,
  add column if not exists name_en text,
  add column if not exists wikipedia_url text;

alter table public.anime
  add column if not exists synopsis_en text,
  add column if not exists age_rating text,
  add column if not exists country_code text;

create table if not exists public.series (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_ro text,
  name_en text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint series_name_nonempty_chk check (length(btrim(name)) > 0)
);
create index if not exists series_name_lower_idx on public.series (lower(name));

alter table public.characters
  drop constraint if exists characters_series_id_fkey;
alter table public.characters
  add constraint characters_series_id_fkey
  foreign key (series_id) references public.series(id) on delete set null;

create table if not exists public.anime_series (
  anime_id uuid not null references public.anime(id) on delete cascade,
  series_id uuid not null references public.series(id) on delete cascade,
  series_role text not null default 'main',
  display_order integer not null default 1,
  primary key (anime_id, series_id, series_role),
  constraint anime_series_role_chk check (series_role in ('main','franchise','season','related','other')),
  constraint anime_series_order_chk check (display_order > 0)
);
create index if not exists anime_series_series_idx on public.anime_series (series_id, anime_id);

create table if not exists public.series_external_ids (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.series(id) on delete cascade,
  source text not null,
  external_id text not null,
  source_url text,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint series_external_source_id_key unique (source, external_id),
  constraint series_external_series_source_key unique (series_id, source)
);
create index if not exists series_external_series_idx on public.series_external_ids (series_id);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_ja text,
  name_kana text,
  name_en text,
  website_url text,
  wikipedia_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_nonempty_chk check (length(btrim(name)) > 0)
);
create index if not exists organizations_name_lower_idx on public.organizations (lower(name));

create table if not exists public.anime_organization_staff (
  id uuid primary key default gen_random_uuid(),
  anime_id uuid not null references public.anime(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  role text not null,
  role_en text,
  display_order integer not null default 1,
  created_at timestamptz not null default now(),
  constraint anime_organization_staff_role_nonempty_chk check (length(btrim(role)) > 0),
  constraint anime_organization_staff_order_chk check (display_order > 0),
  constraint anime_organization_staff_unique unique (anime_id, organization_id, role)
);
create index if not exists anime_organization_staff_org_idx on public.anime_organization_staff (organization_id, anime_id);

create table if not exists public.organization_external_ids (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source text not null,
  external_id text not null,
  source_url text,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint organization_external_source_id_key unique (source, external_id),
  constraint organization_external_org_source_key unique (organization_id, source)
);
create index if not exists organization_external_org_idx on public.organization_external_ids (organization_id);

create table if not exists public.anime_staff_external_ids (
  id uuid primary key default gen_random_uuid(),
  anime_staff_id uuid not null references public.anime_staff(id) on delete cascade,
  source text not null,
  external_id text not null,
  source_url text,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint anime_staff_external_source_id_key unique (source, external_id),
  constraint anime_staff_external_relation_source_key unique (anime_staff_id, source)
);
create index if not exists anime_staff_external_relation_idx on public.anime_staff_external_ids (anime_staff_id);

-- RLS: public catalogue reads are only available through published anime relationships.
alter table public.series enable row level security;
alter table public.anime_series enable row level security;
alter table public.series_external_ids enable row level security;
alter table public.organizations enable row level security;
alter table public.anime_organization_staff enable row level security;
alter table public.organization_external_ids enable row level security;
alter table public.anime_staff_external_ids enable row level security;

drop policy if exists "Series linked to published anime are readable" on public.series;
create policy "Series linked to published anime are readable" on public.series
for select to anon, authenticated
using (exists (
  select 1 from public.anime_series s
  where s.series_id = id and private.is_published_anime(s.anime_id)
));

drop policy if exists "ANIXIA admins manage series" on public.series;
create policy "ANIXIA admins manage series" on public.series
for all to authenticated using (private.is_anixia_admin()) with check (private.is_anixia_admin());

drop policy if exists "Series links of published anime are readable" on public.anime_series;
create policy "Series links of published anime are readable" on public.anime_series
for select to anon, authenticated using (private.is_published_anime(anime_id));

drop policy if exists "ANIXIA admins manage anime series links" on public.anime_series;
create policy "ANIXIA admins manage anime series links" on public.anime_series
for all to authenticated using (private.is_anixia_admin()) with check (private.is_anixia_admin());

drop policy if exists "ANIXIA admins manage series external ids" on public.series_external_ids;
create policy "ANIXIA admins manage series external ids" on public.series_external_ids
for all to authenticated using (private.is_anixia_admin()) with check (private.is_anixia_admin());

drop policy if exists "Organizations linked to published anime are readable" on public.organizations;
create policy "Organizations linked to published anime are readable" on public.organizations
for select to anon, authenticated
using (exists (
  select 1 from public.anime_organization_staff s
  where s.organization_id = id and private.is_published_anime(s.anime_id)
));

drop policy if exists "ANIXIA admins manage organizations" on public.organizations;
create policy "ANIXIA admins manage organizations" on public.organizations
for all to authenticated using (private.is_anixia_admin()) with check (private.is_anixia_admin());

drop policy if exists "Organization staff of published anime are readable" on public.anime_organization_staff;
create policy "Organization staff of published anime are readable" on public.anime_organization_staff
for select to anon, authenticated using (private.is_published_anime(anime_id));

drop policy if exists "ANIXIA admins manage organization staff" on public.anime_organization_staff;
create policy "ANIXIA admins manage organization staff" on public.anime_organization_staff
for all to authenticated using (private.is_anixia_admin()) with check (private.is_anixia_admin());

drop policy if exists "ANIXIA admins manage organization external ids" on public.organization_external_ids;
create policy "ANIXIA admins manage organization external ids" on public.organization_external_ids
for all to authenticated using (private.is_anixia_admin()) with check (private.is_anixia_admin());

drop policy if exists "ANIXIA admins manage anime staff external ids" on public.anime_staff_external_ids;
create policy "ANIXIA admins manage anime staff external ids" on public.anime_staff_external_ids
for all to authenticated using (private.is_anixia_admin()) with check (private.is_anixia_admin());

-- Keep metadata and external identifiers out of anonymous API access.
grant select on public.series, public.anime_series, public.organizations, public.anime_organization_staff to anon, authenticated;
grant insert, update, delete on public.series, public.anime_series, public.organizations, public.anime_organization_staff to authenticated;
grant select, insert, update, delete on public.series_external_ids, public.organization_external_ids, public.anime_staff_external_ids to authenticated;
grant all on public.series, public.anime_series, public.series_external_ids, public.organizations, public.anime_organization_staff, public.organization_external_ids, public.anime_staff_external_ids to service_role;
