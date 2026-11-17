-- Harden the taxonomy editor RPC against search_path object shadowing.
create or replace function public.admin_replace_anime_taxonomy(
  p_anime_id uuid,
  p_genre_ids uuid[] default '{}',
  p_tag_ids uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_genres uuid[];
  v_tags uuid[];
begin
  if not private.is_anixia_admin() then
    raise exception 'ANIXIA administrator permission required' using errcode = '42501';
  end if;

  if not exists (select 1 from public.anime where id = p_anime_id) then
    raise exception 'Anime record not found' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(distinct genre_id), '{}'::uuid[])
    into v_genres
    from unnest(coalesce(p_genre_ids, '{}'::uuid[])) as u(genre_id);
  select coalesce(array_agg(distinct tag_id), '{}'::uuid[])
    into v_tags
    from unnest(coalesce(p_tag_ids, '{}'::uuid[])) as u(tag_id);

  if exists (select 1 from unnest(v_genres) as u(genre_id) where not exists (select 1 from public.genres g where g.id = u.genre_id)) then
    raise exception 'Unknown genre ID supplied' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(v_tags) as u(tag_id) where not exists (select 1 from public.tags t where t.id = u.tag_id)) then
    raise exception 'Unknown tag ID supplied' using errcode = '22023';
  end if;

  delete from public.anime_genres where anime_id = p_anime_id;
  delete from public.anime_tags where anime_id = p_anime_id;

  insert into public.anime_genres (anime_id, genre_id)
  select p_anime_id, genre_id from unnest(v_genres) as u(genre_id)
  on conflict (anime_id, genre_id) do nothing;

  insert into public.anime_tags (anime_id, tag_id)
  select p_anime_id, tag_id from unnest(v_tags) as u(tag_id)
  on conflict (anime_id, tag_id) do nothing;

  return jsonb_build_object(
    'anime_id', p_anime_id,
    'genre_count', cardinality(v_genres),
    'tag_count', cardinality(v_tags)
  );
end;
$$;

revoke all on function public.admin_replace_anime_taxonomy(uuid, uuid[], uuid[]) from public, anon;
grant execute on function public.admin_replace_anime_taxonomy(uuid, uuid[], uuid[]) to authenticated, service_role;
