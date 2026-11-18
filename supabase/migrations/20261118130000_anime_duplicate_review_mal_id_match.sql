create or replace function private.admin_get_anime_duplicate_candidates(p_limit integer default 100)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 100));
  v_result jsonb;
begin
  if not private.is_anixia_admin() then
    raise exception 'ANIXIA administrator permission required' using errcode = '42501';
  end if;
  with raw_variants as (
    select a.id as anime_id, v.raw_name, private.normalize_catalog_entity_name(v.raw_name) as normalized_name
    from public.anime a
    cross join lateral (values (a.title), (a.title_ja), (a.title_kana)) v(raw_name)
    where nullif(btrim(v.raw_name), '') is not null
    union all
    select t.anime_id, t.title, private.normalize_catalog_entity_name(t.title)
    from public.anime_titles t where nullif(btrim(t.title), '') is not null
  ),
  variants as (
    select distinct anime_id, raw_name, normalized_name from raw_variants where length(normalized_name) >= 3
  ),
  title_pairs as (
    select l.anime_id as left_id, r.anime_id as right_id,
      array_agg(distinct l.raw_name order by l.raw_name) as matched_names,
      count(distinct l.normalized_name)::integer as matched_name_count, false as mal_id_match
    from variants l
    join variants r on r.normalized_name = l.normalized_name and l.anime_id < r.anime_id
    join public.anime la on la.id = l.anime_id
    join public.anime ra on ra.id = r.anime_id
    where la.release_year is not null and la.release_year = ra.release_year and la.format = ra.format
    group by l.anime_id, r.anime_id
  ),
  mal_id_values as (
    select a.id as anime_id, btrim(a.mal_anime_id) as mal_id
    from public.anime a where nullif(btrim(a.mal_anime_id), '') is not null
    union
    select x.anime_id, btrim(x.external_id) from public.anime_external_ids x
    where x.source = 'myanimelist' and nullif(btrim(x.external_id), '') is not null
  ),
  mal_pairs as (
    select l.anime_id as left_id, r.anime_id as right_id,
      array['MyAnimeList ID: ' || l.mal_id]::text[] as matched_names,
      1::integer as matched_name_count, true as mal_id_match
    from mal_id_values l join mal_id_values r on r.mal_id = l.mal_id and l.anime_id < r.anime_id
  ),
  pair_rows as (select * from title_pairs union all select * from mal_pairs),
  pairs as (
    select left_id, right_id, array_agg(distinct matched_name order by matched_name) as matched_names,
      max(matched_name_count)::integer as matched_name_count, bool_or(mal_id_match) as mal_id_match
    from pair_rows cross join lateral unnest(matched_names) as names(matched_name)
    group by left_id, right_id
  ),
  enriched as (
    select p.left_id, p.right_id,
      coalesce(nullif(la.title_ja, ''), nullif(la.title, ''), la.title_kana) as left_title,
      coalesce(nullif(ra.title_ja, ''), nullif(ra.title, ''), ra.title_kana) as right_title,
      la.title as left_original_title, ra.title as right_original_title,
      la.release_year, la.format::text as format,
      la.is_published as left_is_published, ra.is_published as right_is_published,
      la.source as left_source, la.source_id as left_source_id,
      ra.source as right_source, ra.source_id as right_source_id,
      p.matched_names, p.matched_name_count, p.mal_id_match,
      coalesce((select jsonb_agg(jsonb_build_object('source', x.source, 'external_id', x.external_id) order by x.source)
        from public.anime_external_ids x where x.anime_id = la.id), '[]'::jsonb) as left_external_ids,
      coalesce((select jsonb_agg(jsonb_build_object('source', x.source, 'external_id', x.external_id) order by x.source)
        from public.anime_external_ids x where x.anime_id = ra.id), '[]'::jsonb) as right_external_ids
    from pairs p join public.anime la on la.id = p.left_id join public.anime ra on ra.id = p.right_id
  )
  select jsonb_build_object(
    'generated_at', now(), 'candidate_count', (select count(*) from enriched),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'left_id', left_id, 'right_id', right_id, 'left_title', left_title, 'right_title', right_title,
        'left_original_title', left_original_title, 'right_original_title', right_original_title,
        'release_year', release_year, 'format', format,
        'left_is_published', left_is_published, 'right_is_published', right_is_published,
        'left_source', left_source, 'left_source_id', left_source_id, 'right_source', right_source, 'right_source_id', right_source_id,
        'left_external_ids', left_external_ids, 'right_external_ids', right_external_ids,
        'matched_names', matched_names, 'matched_name_count', matched_name_count,
        'mal_id_match', mal_id_match,
        'match_reason', case when mal_id_match then 'MyAnimeList ID一致' else '作品名・公開年・形式一致' end
      ) order by mal_id_match desc, left_title, right_title)
      from (select * from enriched order by mal_id_match desc, left_title, right_title limit v_limit) limited
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$function$;

comment on function private.admin_get_anime_duplicate_candidates(integer)
is 'Admin-only read-only anime duplicate report using shared MyAnimeList IDs and normalized titles, release year and format. Never merges records.';