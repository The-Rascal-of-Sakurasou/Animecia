-- Expand public anime search to cover alternate titles, tags, people and characters.
-- Keep the legacy 9-argument overload available for older pages during rollout.
create or replace function public.search_public_anime(
  p_query text,
  p_genre_id uuid,
  p_year integer,
  p_season text,
  p_format public.anime_format,
  p_studio_id uuid,
  p_sort text,
  p_limit integer,
  p_offset integer,
  p_tag_ids uuid[],
  p_person_query text,
  p_character_query text
)
returns table(
  id uuid,
  title text,
  title_ja text,
  title_kana text,
  synopsis text,
  format public.anime_format,
  release_year integer,
  season text,
  episode_count integer,
  poster_url text,
  watchers_count integer,
  reviews_count integer,
  studio_id uuid,
  average_score numeric,
  rating_count bigint,
  total_count bigint
)
language sql
stable
security definer
set search_path to ''
as $function$
  with rating_summary as (
    select r.anime_id,
      round(avg(r.score)::numeric, 2) as average_score,
      count(*)::bigint as rating_count
    from public.ratings r
    group by r.anime_id
  ),
  filtered as (
    select
      a.id, a.title, a.title_ja, a.title_kana, a.synopsis, a.format,
      a.release_year, a.season, a.episode_count, a.poster_url,
      a.watchers_count, a.reviews_count, a.studio_id,
      rs.average_score, coalesce(rs.rating_count, 0)::bigint as rating_count,
      count(*) over()::bigint as total_count
    from public.anime a
    left join rating_summary rs on rs.anime_id = a.id
    where a.is_published = true
      and (
        nullif(trim(coalesce(p_query, '')), '') is null
        or strpos(lower(coalesce(a.title, '')), lower(left(trim(p_query), 80))) > 0
        or strpos(lower(coalesce(a.title_ja, '')), lower(left(trim(p_query), 80))) > 0
        or strpos(lower(coalesce(a.title_kana, '')), lower(left(trim(p_query), 80))) > 0
        or exists (
          select 1
          from public.anime_titles at
          where at.anime_id = a.id
            and strpos(lower(at.title), lower(left(trim(p_query), 80))) > 0
        )
      )
      and (p_genre_id is null or exists (
        select 1 from public.anime_genres ag
        where ag.anime_id = a.id and ag.genre_id = p_genre_id
      ))
      and (
        cardinality(coalesce(p_tag_ids, array[]::uuid[])) = 0
        or exists (
          select 1 from public.anime_tags atg
          where atg.anime_id = a.id
            and atg.tag_id = any((coalesce(p_tag_ids, array[]::uuid[]))[1:30])
        )
      )
      and (p_year is null or a.release_year = p_year)
      and (p_season is null or a.season = p_season)
      and (p_format is null or a.format = p_format)
      and (
        p_studio_id is null
        or a.studio_id = p_studio_id
        or exists (
          select 1 from public.anime_studios ast
          where ast.anime_id = a.id and ast.studio_id = p_studio_id
        )
      )
      and (
        nullif(trim(coalesce(p_person_query, '')), '') is null
        or exists (
          select 1
          from public.anime_staff ast
          join public.people pe on pe.id = ast.person_id
          where ast.anime_id = a.id
            and (
              strpos(lower(coalesce(pe.name, '')), lower(left(trim(p_person_query), 80))) > 0
              or strpos(lower(coalesce(pe.name_ja, '')), lower(left(trim(p_person_query), 80))) > 0
              or strpos(lower(coalesce(pe.name_kana, '')), lower(left(trim(p_person_query), 80))) > 0
              or strpos(lower(coalesce(pe.name_en, '')), lower(left(trim(p_person_query), 80))) > 0
              or strpos(lower(coalesce(pe.nickname, '')), lower(left(trim(p_person_query), 80))) > 0
              or strpos(lower(coalesce(pe.nickname_en, '')), lower(left(trim(p_person_query), 80))) > 0
            )
        )
      )
      and (
        nullif(trim(coalesce(p_character_query, '')), '') is null
        or exists (
          select 1
          from public.anime_characters ac
          join public.characters ch on ch.id = ac.character_id
          where ac.anime_id = a.id
            and (
              strpos(lower(coalesce(ch.name, '')), lower(left(trim(p_character_query), 80))) > 0
              or strpos(lower(coalesce(ch.name_ja, '')), lower(left(trim(p_character_query), 80))) > 0
              or strpos(lower(coalesce(ch.name_kana, '')), lower(left(trim(p_character_query), 80))) > 0
              or strpos(lower(coalesce(ch.name_en, '')), lower(left(trim(p_character_query), 80))) > 0
              or strpos(lower(coalesce(ch.nickname, '')), lower(left(trim(p_character_query), 80))) > 0
              or strpos(lower(coalesce(ch.nickname_en, '')), lower(left(trim(p_character_query), 80))) > 0
            )
        )
      )
      and (coalesce(p_sort, 'newest') <> 'rating' or coalesce(rs.rating_count, 0) >= 5)
  )
  select
    f.id, f.title, f.title_ja, f.title_kana, f.synopsis, f.format,
    f.release_year, f.season, f.episode_count, f.poster_url,
    f.watchers_count, f.reviews_count, f.studio_id, f.average_score,
    f.rating_count, f.total_count
  from filtered f
  order by
    case when p_sort = 'rating' then f.average_score end desc nulls last,
    case when p_sort = 'popular' then coalesce(f.watchers_count, 0) end desc nulls last,
    case when p_sort = 'reviews' then coalesce(f.reviews_count, 0) end desc nulls last,
    case when p_sort = 'title' then lower(coalesce(f.title_ja, f.title)) end asc nulls last,
    case when p_sort = 'newest' or p_sort is null then coalesce(f.release_year, 0) end desc nulls last,
    f.title asc
  limit least(greatest(coalesce(p_limit, 24), 1), 50)
  offset least(greatest(coalesce(p_offset, 0), 0), 10000);
$function$;

revoke all on function public.search_public_anime(
  text, uuid, integer, text, public.anime_format, uuid, text, integer, integer, uuid[], text, text
) from public;
grant execute on function public.search_public_anime(
  text, uuid, integer, text, public.anime_format, uuid, text, integer, integer, uuid[], text, text
) to anon, authenticated, service_role;

comment on function public.search_public_anime(
  text, uuid, integer, text, public.anime_format, uuid, text, integer, integer, uuid[], text, text
) is 'Public search across published anime, alternate titles, genres, tags, studios, staff and characters. Results are limited to published works.';
