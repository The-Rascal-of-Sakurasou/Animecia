-- Keep the legacy 9-argument search signature in sync with the alias-aware search.
-- The wrapper delegates to the 12-argument implementation and adds no separate query logic.

create or replace function public.search_public_anime(
  p_query text default null,
  p_genre_id uuid default null,
  p_year integer default null,
  p_season text default null,
  p_format public.anime_format default null,
  p_studio_id uuid default null,
  p_sort text default 'newest',
  p_limit integer default 24,
  p_offset integer default 0
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
security invoker
set search_path = ''
as $function$
  select *
  from public.search_public_anime(
    p_query,
    p_genre_id,
    p_year,
    p_season,
    p_format,
    p_studio_id,
    p_sort,
    p_limit,
    p_offset,
    array[]::uuid[],
    null::text,
    null::text
  );
$function$;

comment on function public.search_public_anime(text,uuid,integer,text,public.anime_format,uuid,text,integer,integer)
is 'Legacy-compatible wrapper that delegates to the alias-aware 12-argument public anime search.';
