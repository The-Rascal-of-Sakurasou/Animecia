-- Expand the public anime detail payload with curated, published related metadata.
-- The function remains SECURITY DEFINER, so every nested collection explicitly filters publication state.

create or replace function public.get_public_anime_detail(p_anime_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to ''
as $function$
  select jsonb_build_object(
    'id', a.id, 'source', a.source, 'source_id', a.source_id,
    'title', a.title, 'title_ja', a.title_ja, 'title_kana', a.title_kana,
    'synopsis', a.synopsis, 'synopsis_en', a.synopsis_en,
    'format', a.format, 'release_year', a.release_year,
    'season', a.season, 'season_name', a.season_name,
    'episode_count', a.episode_count, 'episodes_count', a.episodes_count,
    'episode_duration_minutes', a.episode_duration_minutes,
    'status', a.status, 'official_url', coalesce(a.official_url, a.official_site_url),
    'poster_url', a.poster_url, 'banner_url', a.banner_url,
    'watchers_count', a.watchers_count, 'reviews_count', a.reviews_count,
    'no_episodes', a.no_episodes, 'age_rating', a.age_rating, 'country_code', a.country_code,
    'studio', (
      select jsonb_build_object('id', s.id, 'name', s.name, 'name_ja', s.name_ja, 'website_url', s.website_url)
      from public.studios s where s.id = a.studio_id
    ),
    'studios', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', x.id, 'name', x.name, 'name_ja', x.name_ja,
        'website_url', x.website_url, 'production_role', x.production_role
      ) order by x.display_order, x.name)
      from (
        select s.id, s.name, s.name_ja, s.website_url, 'primary'::text as production_role, 0 as display_order
        from public.studios s where s.id = a.studio_id
        union
        select s.id, s.name, s.name_ja, s.website_url, ast.production_role, ast.display_order
        from public.anime_studios ast
        join public.studios s on s.id = ast.studio_id
        where ast.anime_id = a.id
      ) x
    ), '[]'::jsonb),
    'genres', coalesce((
      select jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name, 'name_ja', g.name_ja) order by g.name_ja nulls last, g.name)
      from public.anime_genres ag join public.genres g on g.id = ag.genre_id where ag.anime_id = a.id
    ), '[]'::jsonb),
    'tags', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'name_ja', t.name_ja) order by t.name_ja nulls last, t.name)
      from public.anime_tags atg join public.tags t on t.id = atg.tag_id where atg.anime_id = a.id
    ), '[]'::jsonb),
    'titles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', at.title, 'language_code', at.language_code,
        'title_type', at.title_type, 'is_primary', at.is_primary
      ) order by at.is_primary desc, at.language_code, at.title)
      from public.anime_titles at where at.anime_id = a.id
    ), '[]'::jsonb),
    'episodes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'episode_number', e.episode_number, 'episode_order', e.episode_order,
        'episode_kind', e.episode_kind, 'title', e.title, 'title_ja', e.title_ja,
        'synopsis', e.synopsis, 'aired_at', e.aired_at, 'duration_seconds', e.duration_seconds
      ) order by e.episode_order, e.id)
      from public.episodes e
      where e.anime_id = a.id and e.is_published = true
    ), '[]'::jsonb),
    'series', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.name, 'name_ro', s.name_ro,
        'name_en', s.name_en, 'series_role', ax.series_role
      ) order by ax.display_order, s.name)
      from public.anime_series ax join public.series s on s.id = ax.series_id
      where ax.anime_id = a.id
    ), '[]'::jsonb),
    'related_works', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.related_id, 'title', r.title, 'title_ja', r.title_ja,
        'format', r.format, 'release_year', r.release_year,
        'relation_type', r.relation_type, 'direction', r.direction
      ) order by r.display_order, r.release_year nulls last, r.title)
      from (
        select ar.related_anime_id as related_id, ra.title, ra.title_ja, ra.format,
          ra.release_year, ar.relation_type, 'outgoing'::text as direction, ar.display_order
        from public.anime_relations ar
        join public.anime ra on ra.id = ar.related_anime_id and ra.is_published = true
        where ar.anime_id = a.id
        union all
        select ar.anime_id as related_id, ra.title, ra.title_ja, ra.format,
          ra.release_year, ar.relation_type, 'incoming'::text as direction, ar.display_order
        from public.anime_relations ar
        join public.anime ra on ra.id = ar.anime_id and ra.is_published = true
        where ar.related_anime_id = a.id
      ) r
    ), '[]'::jsonb),
    'organizations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id, 'name', o.name, 'name_ja', o.name_ja,
        'role', aos.role, 'role_en', aos.role_en
      ) order by aos.display_order, o.name)
      from public.anime_organization_staff aos
      join public.organizations o on o.id = aos.organization_id
      where aos.anime_id = a.id
    ), '[]'::jsonb),
    'characters', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'name', c.name, 'name_ja', c.name_ja,
        'image_url', c.image_url, 'description', c.description, 'role', ac.role
      ))
      from public.anime_characters ac
      join public.characters c on c.id = ac.character_id
      where ac.anime_id = a.id
    ), '[]'::jsonb),
    'staff', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'name_ja', p.name_ja,
        'person_type', p.person_type, 'image_url', p.image_url, 'role', ast.role
      ))
      from public.anime_staff ast
      join public.people p on p.id = ast.person_id
      where ast.anime_id = a.id
    ), '[]'::jsonb),
    'reviews', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', rv.id, 'title', rv.title, 'body', rv.body,
        'spoiler', rv.spoiler, 'created_at', rv.created_at
      ) order by rv.created_at desc)
      from public.reviews rv
      where rv.anime_id = a.id and rv.is_published = true
    ), '[]'::jsonb)
  )
  from public.anime a
  where a.id = p_anime_id and a.is_published = true;
$function$;

revoke all on function public.get_public_anime_detail(uuid) from public, anon;
grant execute on function public.get_public_anime_detail(uuid) to anon, authenticated, service_role;
