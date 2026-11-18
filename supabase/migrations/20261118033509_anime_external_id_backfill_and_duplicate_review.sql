-- Backfill the normalized cross-provider ID map for every existing catalog row.
-- Existing source/source_id values remain untouched.
insert into public.anime_external_ids
  (anime_id, source, external_id, source_url, is_primary, last_verified_at)
select
  a.id,
  a.source,
  a.source_id,
  case
    when a.source = 'wikidata' and a.source_id ~ '^Q[0-9]+$'
      then 'https://www.wikidata.org/wiki/' || a.source_id
    when a.source = 'annict'
      then 'https://annict.com/works/' || a.source_id
    when a.source = 'myanimelist' and a.source_id ~ '^[0-9]+$'
      then 'https://myanimelist.net/anime/' || a.source_id
    else null
  end,
  true,
  coalesce(a.source_synced_at, now())
from public.anime a
where a.source is not null
  and a.source_id is not null
  and length(btrim(a.source_id)) > 0
  and not exists (
    select 1
    from public.anime_external_ids x
    where x.anime_id = a.id
      and x.source = a.source
      and x.external_id = a.source_id
  )
on conflict (source, external_id) do nothing;

-- Admin-only report of exact-title candidates. This never merges or modifies works.
create or replace function private.admin_get_anime_duplicate_candidates(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 100));
  v_result jsonb;
begin
  if not private.is_anixia_admin() then
    raise exception 'ANIXIA administrator permission required' using errcode = '42501';
  end if;

  with raw_variants as (
    select a.id as anime_id, v.raw_name,
      private.normalize_catalog_entity_name(v.raw_name) as normalized_name
    from public.anime a
    cross join lateral (values (a.title), (a.title_ja), (a.title_kana)) v(raw_name)
    where nullif(btrim(v.raw_name), '') is not null

    union all

    select t.anime_id, t.title,
      private.normalize_catalog_entity_name(t.title)
    from public.anime_titles t
    where nullif(btrim(t.title), '') is not null
  ),
  variants as (
    select distinct anime_id, raw_name, normalized_name
    from raw_variants
    where length(normalized_name) >= 3
  ),
  pairs as (
    select
      l.anime_id as left_id,
      r.anime_id as right_id,
      array_agg(distinct l.raw_name order by l.raw_name) as matched_names,
      count(distinct l.normalized_name)::integer as matched_name_count
    from variants l
    join variants r
      on r.normalized_name = l.normalized_name
      and l.anime_id < r.anime_id
    join public.anime la on la.id = l.anime_id
    join public.anime ra on ra.id = r.anime_id
    where la.release_year is not null
      and la.release_year = ra.release_year
      and la.format = ra.format
    group by l.anime_id, r.anime_id
  ),
  enriched as (
    select
      p.left_id,
      p.right_id,
      coalesce(nullif(la.title_ja, ''), nullif(la.title, ''), la.title_kana) as left_title,
      coalesce(nullif(ra.title_ja, ''), nullif(ra.title, ''), ra.title_kana) as right_title,
      la.title as left_original_title,
      ra.title as right_original_title,
      la.release_year,
      la.format::text as format,
      la.is_published as left_is_published,
      ra.is_published as right_is_published,
      la.source as left_source,
      la.source_id as left_source_id,
      ra.source as right_source,
      ra.source_id as right_source_id,
      p.matched_names,
      p.matched_name_count,
      coalesce((
        select jsonb_agg(jsonb_build_object('source', x.source, 'external_id', x.external_id) order by x.source)
        from public.anime_external_ids x where x.anime_id = la.id
      ), '[]'::jsonb) as left_external_ids,
      coalesce((
        select jsonb_agg(jsonb_build_object('source', x.source, 'external_id', x.external_id) order by x.source)
        from public.anime_external_ids x where x.anime_id = ra.id
      ), '[]'::jsonb) as right_external_ids
    from pairs p
    join public.anime la on la.id = p.left_id
    join public.anime ra on ra.id = p.right_id
  )
  select jsonb_build_object(
    'generated_at', now(),
    'candidate_count', (select count(*) from enriched),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'left_id', left_id,
        'right_id', right_id,
        'left_title', left_title,
        'right_title', right_title,
        'left_original_title', left_original_title,
        'right_original_title', right_original_title,
        'release_year', release_year,
        'format', format,
        'left_is_published', left_is_published,
        'right_is_published', right_is_published,
        'left_source', left_source,
        'left_source_id', left_source_id,
        'right_source', right_source,
        'right_source_id', right_source_id,
        'left_external_ids', left_external_ids,
        'right_external_ids', right_external_ids,
        'matched_names', matched_names,
        'matched_name_count', matched_name_count
      ) order by left_title, right_title)
      from (select * from enriched order by left_title, right_title limit v_limit) limited
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$function$;

revoke all on function private.admin_get_anime_duplicate_candidates(integer) from public, anon;
grant execute on function private.admin_get_anime_duplicate_candidates(integer) to authenticated, service_role;

create or replace function public.admin_get_anime_duplicate_candidates(p_limit integer default 100)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select private.admin_get_anime_duplicate_candidates(p_limit);
$function$;

revoke all on function public.admin_get_anime_duplicate_candidates(integer) from public, anon;
grant execute on function public.admin_get_anime_duplicate_candidates(integer) to authenticated, service_role;

comment on function public.admin_get_anime_duplicate_candidates(integer)
is 'Admin-only read-only report of anime records sharing normalized titles, release year and format. Never merges records.';
