-- Admin-only catalogue quality report. Read-only; never changes publication state.
create or replace function public.admin_get_catalog_quality_report(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 200));
  v_result jsonb;
begin
  if not private.is_anixia_admin() then
    raise exception 'ANIXIA administrator permission required' using errcode = '42501';
  end if;

  with duplicate_titles as (
    select lower(regexp_replace(btrim(coalesce(nullif(title_ja, ''), nullif(title_kana, ''), title)), '[[:space:]]+', ' ', 'g')) as normalized_title
    from public.anime
    where btrim(coalesce(nullif(title_ja, ''), nullif(title_kana, ''), title, '')) <> ''
    group by 1
    having count(*) > 1
  ),
  issues as (
    select a.id as anime_id, 'anime'::text as entity_type, a.id as entity_id,
      case when a.is_published then 'critical' else 'warning' end as severity,
      'missing_japanese_title'::text as issue_code, '作品名'::text as field_name,
      '日本語タイトルが登録されていません。'::text as message,
      coalesce(nullif(a.title, ''), 'タイトル未設定') as display_title,
      a.is_published
    from public.anime a
    where nullif(btrim(a.title_ja), '') is null
      and nullif(btrim(a.title_kana), '') is null
      and nullif(btrim(a.title), '') is null

    union all
    select a.id, 'anime', a.id,
      case when a.is_published then 'critical' else 'warning' end,
      'missing_synopsis', 'あらすじ', 'あらすじが登録されていません。',
      coalesce(nullif(a.title_ja,''), nullif(a.title_kana,''), a.title), a.is_published
    from public.anime a
    where nullif(btrim(a.synopsis), '') is null

    union all
    select a.id, 'anime', a.id, 'warning',
      'missing_release_date', '公開・放送時期', '公開年または公開日が登録されていません。',
      coalesce(nullif(a.title_ja,''), nullif(a.title_kana,''), a.title), a.is_published
    from public.anime a
    where a.release_year is null and a.released_on is null

    union all
    select a.id, 'anime', a.id, 'info',
      'missing_official_url', '公式サイト', '公式サイトURLが登録されていません（必須とは限りません）。',
      coalesce(nullif(a.title_ja,''), nullif(a.title_kana,''), a.title), a.is_published
    from public.anime a
    where nullif(btrim(a.official_url), '') is null
      and nullif(btrim(a.official_site_url), '') is null

    union all
    select a.id, 'anime', a.id, 'warning',
      'invalid_official_url', '公式サイト', '公式サイトURLがhttp://またはhttps://で始まっていません。',
      coalesce(nullif(a.title_ja,''), nullif(a.title_kana,''), a.title), a.is_published
    from public.anime a
    where coalesce(nullif(btrim(a.official_url), ''), nullif(btrim(a.official_site_url), '')) is not null
      and coalesce(nullif(btrim(a.official_url), ''), nullif(btrim(a.official_site_url), '')) !~* '^https?://'

    union all
    select a.id, 'anime', a.id, 'warning',
      'missing_genre', 'ジャンル', 'ジャンルが1件も設定されていません。',
      coalesce(nullif(a.title_ja,''), nullif(a.title_kana,''), a.title), a.is_published
    from public.anime a
    where not exists (select 1 from public.anime_genres ag where ag.anime_id = a.id)

    union all
    select a.id, 'anime', a.id, 'warning',
      'suspicious_release_year', '公開年', '公開年が1900年より前、または現在から5年以上先です。誤入力でないか確認してください。',
      coalesce(nullif(a.title_ja,''), nullif(a.title_kana,''), a.title), a.is_published
    from public.anime a
    where a.release_year is not null
      and (a.release_year < 1900 or a.release_year > extract(year from now())::integer + 5)

    union all
    select a.id, 'anime', a.id, 'warning',
      'duplicate_title_candidate', '作品名', '同じ正規化タイトルの作品が複数あります。続編・リメイク等の別作品か、重複登録かを確認してください。',
      coalesce(nullif(a.title_ja,''), nullif(a.title_kana,''), a.title), a.is_published
    from public.anime a
    join duplicate_titles d
      on d.normalized_title = lower(regexp_replace(btrim(coalesce(nullif(a.title_ja, ''), nullif(a.title_kana, ''), a.title)), '[[:space:]]+', ' ', 'g'))

    union all
    select a.id, 'anime', a.id, 'info',
      'episode_count_mismatch', '話数', '登録済みエピソード数と作品の話数情報が一致しません。未取得・特別編の有無も確認してください。',
      coalesce(nullif(a.title_ja,''), nullif(a.title_kana,''), a.title), a.is_published
    from public.anime a
    join lateral (
      select count(*)::integer as actual_count from public.episodes e where e.anime_id = a.id
    ) ec on true
    where coalesce(a.episodes_count, a.episode_count) is not null
      and ec.actual_count > 0
      and ec.actual_count <> coalesce(a.episodes_count, a.episode_count)

    union all
    select a.id, 'anime', a.id, 'info',
      'episodes_not_imported', 'エピソード', '作品に話数情報がありますが、エピソード詳細がまだ登録されていません。',
      coalesce(nullif(a.title_ja,''), nullif(a.title_kana,''), a.title), a.is_published
    from public.anime a
    where coalesce(a.episodes_count, a.episode_count, 0) > 0
      and not exists (select 1 from public.episodes e where e.anime_id = a.id)

    union all
    select a.id, 'anime', a.id, case when a.is_published then 'critical' else 'warning' end,
      'missing_primary_studio', '制作会社', '制作会社が登録されていません。',
      coalesce(nullif(a.title_ja,''), nullif(a.title_kana,''), a.title), a.is_published
    from public.anime a
    where a.studio_id is null
      and not exists (select 1 from public.anime_studios ast where ast.anime_id = a.id)

    union all
    select e.anime_id, 'episode', e.id,
      case when e.is_published then 'critical' else 'warning' end,
      'unknown_episode_kind', 'エピソード種別', 'エピソード種別が「不明」のままです。公開前に確認してください。',
      coalesce(nullif(a.title_ja,''), nullif(a.title_kana,''), a.title), e.is_published
    from public.episodes e
    join public.anime a on a.id = e.anime_id
    where e.episode_kind = 'unknown'

    union all
    select e.anime_id, 'episode', e.id,
      case when e.is_published then 'critical' else 'warning' end,
      'episode_missing_title', 'エピソードタイトル', 'エピソードタイトルが登録されていません。',
      coalesce(nullif(a.title_ja,''), nullif(a.title_kana,''), a.title), e.is_published
    from public.episodes e
    join public.anime a on a.id = e.anime_id
    where nullif(btrim(e.title_ja), '') is null and nullif(btrim(e.title), '') is null
  )
  select jsonb_build_object(
    'generated_at', now(),
    'summary', jsonb_build_object(
      'anime_checked', (select count(*) from public.anime),
      'published_checked', (select count(*) from public.anime where is_published),
      'issue_count', (select count(*) from issues),
      'critical_count', (select count(*) from issues where severity = 'critical'),
      'warning_count', (select count(*) from issues where severity = 'warning'),
      'info_count', (select count(*) from issues where severity = 'info'),
      'affected_anime_count', (select count(distinct anime_id) from issues)
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'anime_id', anime_id,
        'entity_type', entity_type,
        'entity_id', entity_id,
        'severity', severity,
        'issue_code', issue_code,
        'field_name', field_name,
        'message', message,
        'display_title', display_title,
        'is_published', is_published
      ) order by case severity when 'critical' then 1 when 'warning' then 2 else 3 end,
        display_title, issue_code)
      from (select * from issues
        order by case severity when 'critical' then 1 when 'warning' then 2 else 3 end,
          display_title, issue_code
        limit v_limit) limited
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$function$;

revoke all on function public.admin_get_catalog_quality_report(integer) from public;
revoke all on function public.admin_get_catalog_quality_report(integer) from anon;
grant execute on function public.admin_get_catalog_quality_report(integer) to authenticated, service_role;
