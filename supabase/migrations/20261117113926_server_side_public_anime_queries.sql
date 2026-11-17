CREATE OR REPLACE FUNCTION public.is_published_anime(p_anime_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.anime a WHERE a.id = p_anime_id AND a.is_published = true);
$function$;
REVOKE ALL ON FUNCTION public.is_published_anime(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_published_anime(uuid) TO anon, authenticated;
DROP POLICY IF EXISTS "Published anime are readable" ON public.anime;
DROP POLICY IF EXISTS "Anime characters are readable" ON public.anime_characters;
CREATE POLICY "Anime characters are readable" ON public.anime_characters FOR SELECT TO anon, authenticated USING (public.is_published_anime(anime_id));
DROP POLICY IF EXISTS "Anime genres are readable" ON public.anime_genres;
CREATE POLICY "Anime genres are readable" ON public.anime_genres FOR SELECT TO anon, authenticated USING (public.is_published_anime(anime_id));
DROP POLICY IF EXISTS "Anime staff are readable" ON public.anime_staff;
CREATE POLICY "Anime staff are readable" ON public.anime_staff FOR SELECT TO anon, authenticated USING (public.is_published_anime(anime_id));
DROP POLICY IF EXISTS "Anime tags are readable" ON public.anime_tags;
CREATE POLICY "Anime tags are readable" ON public.anime_tags FOR SELECT TO anon, authenticated USING (public.is_published_anime(anime_id));
CREATE OR REPLACE FUNCTION public.search_public_anime(
  p_query text DEFAULT NULL, p_genre_id uuid DEFAULT NULL, p_year integer DEFAULT NULL,
  p_season text DEFAULT NULL, p_format public.anime_format DEFAULT NULL,
  p_studio_id uuid DEFAULT NULL, p_sort text DEFAULT 'newest',
  p_limit integer DEFAULT 24, p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid, title text, title_ja text, title_kana text, synopsis text,
  format public.anime_format, release_year integer, season text, episode_count integer,
  poster_url text, watchers_count integer, reviews_count integer, studio_id uuid,
  average_score numeric, rating_count bigint, total_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  WITH rating_summary AS (
    SELECT r.anime_id, round(avg(r.score)::numeric, 2) AS average_score, count(*)::bigint AS rating_count
    FROM public.ratings r GROUP BY r.anime_id
  ),
  filtered AS (
    SELECT a.id,a.title,a.title_ja,a.title_kana,a.synopsis,a.format,a.release_year,a.season,
      a.episode_count,a.poster_url,a.watchers_count,a.reviews_count,a.studio_id,
      rs.average_score,coalesce(rs.rating_count,0)::bigint AS rating_count,count(*) OVER()::bigint AS total_count
    FROM public.anime a LEFT JOIN rating_summary rs ON rs.anime_id=a.id
    WHERE a.is_published=true
      AND (nullif(trim(coalesce(p_query,'')),'') IS NULL OR strpos(lower(coalesce(a.title,'')),lower(trim(p_query)))>0 OR strpos(lower(coalesce(a.title_ja,'')),lower(trim(p_query)))>0 OR strpos(lower(coalesce(a.title_kana,'')),lower(trim(p_query)))>0)
      AND (p_genre_id IS NULL OR EXISTS (SELECT 1 FROM public.anime_genres ag WHERE ag.anime_id=a.id AND ag.genre_id=p_genre_id))
      AND (p_year IS NULL OR a.release_year=p_year)
      AND (p_season IS NULL OR a.season=p_season)
      AND (p_format IS NULL OR a.format=p_format)
      AND (p_studio_id IS NULL OR a.studio_id=p_studio_id)
      AND (coalesce(p_sort,'newest')<>'rating' OR coalesce(rs.rating_count,0)>=5)
  )
  SELECT f.id,f.title,f.title_ja,f.title_kana,f.synopsis,f.format,f.release_year,f.season,
    f.episode_count,f.poster_url,f.watchers_count,f.reviews_count,f.studio_id,
    f.average_score,f.rating_count,f.total_count
  FROM filtered f
  ORDER BY
    CASE WHEN p_sort='rating' THEN f.average_score END DESC NULLS LAST,
    CASE WHEN p_sort='popular' THEN coalesce(f.watchers_count,0) END DESC NULLS LAST,
    CASE WHEN p_sort='reviews' THEN coalesce(f.reviews_count,0) END DESC NULLS LAST,
    CASE WHEN p_sort='title' THEN lower(coalesce(f.title_ja,f.title)) END ASC NULLS LAST,
    CASE WHEN p_sort='newest' OR p_sort IS NULL THEN coalesce(f.release_year,0) END DESC NULLS LAST,
    f.title ASC
  LIMIT least(greatest(coalesce(p_limit,24),1),50)
  OFFSET least(greatest(coalesce(p_offset,0),0),10000);
$function$;
REVOKE ALL ON FUNCTION public.search_public_anime(text,uuid,integer,text,public.anime_format,uuid,text,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_public_anime(text,uuid,integer,text,public.anime_format,uuid,text,integer,integer) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.get_public_anime_detail(p_anime_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT jsonb_build_object(
    'id',a.id,'source',a.source,'source_id',a.source_id,'title',a.title,'title_ja',a.title_ja,'title_kana',a.title_kana,
    'synopsis',a.synopsis,'format',a.format,'release_year',a.release_year,'season',a.season,'season_name',a.season_name,
    'episode_count',a.episode_count,'episodes_count',a.episodes_count,'episode_duration_minutes',a.episode_duration_minutes,
    'status',a.status,'official_url',a.official_url,'poster_url',a.poster_url,'banner_url',a.banner_url,
    'watchers_count',a.watchers_count,'reviews_count',a.reviews_count,'no_episodes',a.no_episodes,
    'studio',(SELECT jsonb_build_object('id',s.id,'name',s.name,'name_ja',s.name_ja,'website_url',s.website_url) FROM public.studios s WHERE s.id=a.studio_id),
    'genres',coalesce((SELECT jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'name_ja',g.name_ja) ORDER BY g.name_ja NULLS LAST,g.name) FROM public.anime_genres ag JOIN public.genres g ON g.id=ag.genre_id WHERE ag.anime_id=a.id),'[]'::jsonb),
    'characters',coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'name_ja',c.name_ja,'image_url',c.image_url,'description',c.description,'role',ac.role)) FROM public.anime_characters ac JOIN public.characters c ON c.id=ac.character_id WHERE ac.anime_id=a.id),'[]'::jsonb),
    'staff',coalesce((SELECT jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'name_ja',p.name_ja,'person_type',p.person_type,'image_url',p.image_url,'role',ast.role)) FROM public.anime_staff ast JOIN public.people p ON p.id=ast.person_id WHERE ast.anime_id=a.id),'[]'::jsonb),
    'reviews',coalesce((SELECT jsonb_agg(jsonb_build_object('id',rv.id,'title',rv.title,'body',rv.body,'spoiler',rv.spoiler,'created_at',rv.created_at) ORDER BY rv.created_at DESC) FROM public.reviews rv WHERE rv.anime_id=a.id AND rv.is_published=true),'[]'::jsonb)
  ) FROM public.anime a WHERE a.id=p_anime_id AND a.is_published=true;
$function$;
REVOKE ALL ON FUNCTION public.get_public_anime_detail(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_anime_detail(uuid) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.get_public_anime_by_ids(p_anime_ids uuid[])
RETURNS TABLE(id uuid,title text,title_ja text,title_kana text,format public.anime_format,release_year integer,season text,poster_url text,watchers_count integer,reviews_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT a.id,a.title,a.title_ja,a.title_kana,a.format,a.release_year,a.season,a.poster_url,a.watchers_count,a.reviews_count
  FROM public.anime a WHERE a.is_published=true AND a.id=ANY(coalesce(p_anime_ids,ARRAY[]::uuid[]))
  ORDER BY array_position(p_anime_ids,a.id) LIMIT 100;
$function$;
REVOKE ALL ON FUNCTION public.get_public_anime_by_ids(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_anime_by_ids(uuid[]) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.recommend_public_anime(
  p_genre_ids uuid[] DEFAULT ARRAY[]::uuid[],p_format public.anime_format DEFAULT NULL,
  p_year integer DEFAULT NULL,p_season text DEFAULT NULL,p_limit integer DEFAULT 20
)
RETURNS TABLE(id uuid,title text,title_ja text,title_kana text,format public.anime_format,release_year integer,season text,poster_url text,watchers_count integer,reviews_count integer,match_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  WITH genre_matches AS (
    SELECT ag.anime_id,count(*)::integer AS matches FROM public.anime_genres ag
    WHERE ag.genre_id=ANY(coalesce(p_genre_ids,ARRAY[]::uuid[])) GROUP BY ag.anime_id
  )
  SELECT a.id,a.title,a.title_ja,a.title_kana,a.format,a.release_year,a.season,a.poster_url,
    a.watchers_count,a.reviews_count,coalesce(gm.matches,0)::integer
  FROM public.anime a LEFT JOIN genre_matches gm ON gm.anime_id=a.id
  WHERE a.is_published=true
    AND (cardinality(coalesce(p_genre_ids,ARRAY[]::uuid[]))=0 OR gm.matches>0)
    AND (p_format IS NULL OR a.format=p_format)
    AND (p_year IS NULL OR a.release_year=p_year)
    AND (p_season IS NULL OR a.season=p_season)
  ORDER BY coalesce(gm.matches,0) DESC,coalesce(a.watchers_count,0) DESC,coalesce(a.reviews_count,0) DESC
  LIMIT least(greatest(coalesce(p_limit,20),1),30);
$function$;
REVOKE ALL ON FUNCTION public.recommend_public_anime(uuid[],public.anime_format,integer,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recommend_public_anime(uuid[],public.anime_format,integer,text,integer) TO anon,authenticated;
