-- ANIXIA admin taxonomy editor permissions and transactional replacement.
-- Public readers only see taxonomy attached to published works; admins can curate candidates.

drop policy if exists "ANIXIA admins manage genres" on public.genres;
create policy "ANIXIA admins manage genres" on public.genres
for all to authenticated
using (private.is_anixia_admin())
with check (private.is_anixia_admin());

drop policy if exists "ANIXIA admins manage tags" on public.tags;
create policy "ANIXIA admins manage tags" on public.tags
for all to authenticated
using (private.is_anixia_admin())
with check (private.is_anixia_admin());

drop policy if exists "ANIXIA admins manage anime genres" on public.anime_genres;
create policy "ANIXIA admins manage anime genres" on public.anime_genres
for all to authenticated
using (private.is_anixia_admin())
with check (private.is_anixia_admin());

drop policy if exists "ANIXIA admins manage anime tags" on public.anime_tags;
create policy "ANIXIA admins manage anime tags" on public.anime_tags
for all to authenticated
using (private.is_anixia_admin())
with check (private.is_anixia_admin());

grant select on public.genres, public.tags, public.anime_genres, public.anime_tags to anon, authenticated;
grant insert, update on public.genres, public.tags to authenticated;
grant insert, update, delete on public.anime_genres, public.anime_tags to authenticated;

create index if not exists anime_genres_genre_anime_idx
  on public.anime_genres (genre_id, anime_id);
create index if not exists anime_tags_tag_anime_idx
  on public.anime_tags (tag_id, anime_id);

create or replace function public.admin_replace_anime_taxonomy(
  p_anime_id uuid,
  p_genre_ids uuid[] default '{}',
  p_tag_ids uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_genres uuid[];
  v_tags uuid[];
  v_genre_count integer;
  v_tag_count integer;
begin
  if not private.is_anixia_admin() then
    raise exception 'ANIXIA administrator permission required' using errcode = '42501';
  end if;

  if not exists (select 1 from public.anime where id = p_anime_id) then
    raise exception 'Anime record not found' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(distinct x), '{}'::uuid[])
    into v_genres
    from unnest(coalesce(p_genre_ids, '{}'::uuid[])) as x;
  select coalesce(array_agg(distinct x), '{}'::uuid[])
    into v_tags
    from unnest(coalesce(p_tag_ids, '{}'::uuid[])) as x;

  if exists (select 1 from unnest(v_genres) x where not exists (select 1 from public.genres g where g.id = x)) then
    raise exception 'Unknown genre ID supplied' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(v_tags) x where not exists (select 1 from public.tags t where t.id = x)) then
    raise exception 'Unknown tag ID supplied' using errcode = '22023';
  end if;

  delete from public.anime_genres where anime_id = p_anime_id;
  delete from public.anime_tags where anime_id = p_anime_id;

  insert into public.anime_genres (anime_id, genre_id)
  select p_anime_id, x from unnest(v_genres) as x
  on conflict (anime_id, genre_id) do nothing;

  insert into public.anime_tags (anime_id, tag_id)
  select p_anime_id, x from unnest(v_tags) as x
  on conflict (anime_id, tag_id) do nothing;

  get diagnostics v_genre_count = row_count;
  select count(*) into v_tag_count from public.anime_tags where anime_id = p_anime_id;

  return jsonb_build_object(
    'anime_id', p_anime_id,
    'genre_count', cardinality(v_genres),
    'tag_count', cardinality(v_tags)
  );
end;
$$;

revoke all on function public.admin_replace_anime_taxonomy(uuid, uuid[], uuid[]) from public, anon;
grant execute on function public.admin_replace_anime_taxonomy(uuid, uuid[], uuid[]) to authenticated, service_role;
