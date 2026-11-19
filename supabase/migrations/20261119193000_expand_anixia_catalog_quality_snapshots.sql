alter table private.anixia_catalog_quality_snapshots
  add column if not exists published_missing_genre integer not null default 0,
  add column if not exists published_tv_missing_season integer not null default 0,
  add column if not exists published_missing_title_kana integer not null default 0,
  add column if not exists people_missing_japanese_name integer not null default 0,
  add column if not exists characters_missing_japanese_name integer not null default 0;

create or replace function public.capture_anixia_catalog_quality_snapshot()
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into private.anixia_catalog_quality_snapshots(
    total_works,published_works,unpublished_works,
    published_missing_poster,published_missing_synopsis,
    published_missing_official_url,published_missing_studio,
    duplicate_title_groups,published_missing_genre,
    published_tv_missing_season,published_missing_title_kana,
    people_missing_japanese_name,characters_missing_japanese_name
  )
  with dup as (
    select count(*)::integer as groups_count from (
      select lower(regexp_replace(btrim(coalesce(nullif(title_ja,''),nullif(title_kana,''),title)),'[[:space:]]+',' ','g')) norm
      from public.anime
      where btrim(coalesce(nullif(title_ja,''),nullif(title_kana,''),title,''))<>''
      group by norm having count(*)>1
    ) d
  )
  select
    (select count(*) from public.anime),
    (select count(*) from public.anime where is_published),
    (select count(*) from public.anime where not is_published),
    (select count(*) from public.anime where is_published and nullif(btrim(poster_url),'') is null),
    (select count(*) from public.anime where is_published and nullif(btrim(synopsis),'') is null),
    (select count(*) from public.anime where is_published and nullif(btrim(official_url),'') is null and nullif(btrim(official_site_url),'') is null),
    (select count(*) from public.anime where is_published and studio_id is null and not exists(select 1 from public.anime_studios ast where ast.anime_id=anime.id)),
    (select groups_count from dup),
    (select count(*) from public.anime a where a.is_published and not exists(select 1 from public.anime_genres ag where ag.anime_id=a.id)),
    (select count(*) from public.anime a where a.is_published and a.format='tv' and a.season is null and nullif(btrim(a.season_name),'') is null and nullif(btrim(a.season_name_text),'') is null),
    (select count(*) from public.anime where is_published and nullif(btrim(title_kana),'') is null),
    (select count(*) from public.people where nullif(btrim(name_ja),'') is null),
    (select count(*) from public.characters where nullif(btrim(name_ja),'') is null);
end;
$function$;

revoke all on function public.capture_anixia_catalog_quality_snapshot() from public;
revoke all on function public.capture_anixia_catalog_quality_snapshot() from anon, authenticated;
grant execute on function public.capture_anixia_catalog_quality_snapshot() to service_role;
