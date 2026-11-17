-- Secure autocomplete suggestions for the public catalog.
-- The private SECURITY DEFINER function only emits entities linked to published anime.
-- The exposed RPC is SECURITY INVOKER and delegates to the guarded private function.

create or replace function private.suggest_public_catalog(
  p_query text,
  p_type text default 'all',
  p_limit integer default 10
)
returns table (
  suggestion_type text,
  suggestion_id uuid,
  label text,
  detail text
)
language sql
stable
security definer
set search_path = ''
as $function$
  with input as (
    select
      private.normalize_catalog_entity_name(left(trim(coalesce(p_query, '')), 80)) as term,
      lower(coalesce(p_type, 'all')) as kind,
      least(greatest(coalesce(p_limit, 10), 1), 10) as result_limit
  ),
  candidates as (
    select
      'anime'::text as suggestion_type,
      a.id as suggestion_id,
      coalesce(nullif(a.title_ja, ''), nullif(a.title, ''), nullif(a.title_kana, '')) as label,
      concat_ws(' · ', nullif(a.title, ''), a.release_year::text) as detail,
      case
        when private.normalize_catalog_entity_name(a.title_ja) = i.term
          or private.normalize_catalog_entity_name(a.title) = i.term then 0 else 1
      end as exact_rank
    from public.anime a
    cross join input i
    where a.is_published
      and i.kind in ('all', 'anime')
      and i.term <> ''
      and (
        starts_with(private.normalize_catalog_entity_name(a.title), i.term)
        or starts_with(private.normalize_catalog_entity_name(a.title_ja), i.term)
        or starts_with(private.normalize_catalog_entity_name(a.title_kana), i.term)
        or exists (
          select 1
          from public.anime_titles at
          where at.anime_id = a.id
            and starts_with(private.normalize_catalog_entity_name(at.title), i.term)
        )
      )

    union all

    select
      'person'::text,
      pe.id,
      coalesce(nullif(pe.name_ja, ''), nullif(pe.name, ''), nullif(pe.name_kana, ''), nullif(pe.name_en, '')),
      concat_ws(' · ', '声優・スタッフ',
        case when nullif(pe.name_en, '') is not null and pe.name_en is distinct from coalesce(nullif(pe.name_ja, ''), nullif(pe.name, '')) then pe.name_en end
      ),
      case
        when private.normalize_catalog_entity_name(pe.name_ja) = i.term
          or private.normalize_catalog_entity_name(pe.name) = i.term then 0 else 1
      end
    from public.people pe
    cross join input i
    where i.kind in ('all', 'person')
      and i.term <> ''
      and exists (
        select 1 from public.anime_staff ast
        join public.anime a on a.id = ast.anime_id and a.is_published
        where ast.person_id = pe.id
      )
      and (
        starts_with(private.normalize_catalog_entity_name(pe.name), i.term)
        or starts_with(private.normalize_catalog_entity_name(pe.name_ja), i.term)
        or starts_with(private.normalize_catalog_entity_name(pe.name_kana), i.term)
        or starts_with(private.normalize_catalog_entity_name(pe.name_en), i.term)
        or starts_with(private.normalize_catalog_entity_name(pe.nickname), i.term)
        or starts_with(private.normalize_catalog_entity_name(pe.nickname_en), i.term)
        or exists (
          select 1 from public.catalog_entity_aliases cea
          where cea.entity_type = 'people'
            and cea.entity_id = pe.id
            and starts_with(private.normalize_catalog_entity_name(cea.alias), i.term)
        )
      )

    union all

    select
      'character'::text,
      ch.id,
      coalesce(nullif(ch.name_ja, ''), nullif(ch.name, ''), nullif(ch.name_kana, ''), nullif(ch.name_en, '')),
      'キャラクター'::text,
      case
        when private.normalize_catalog_entity_name(ch.name_ja) = i.term
          or private.normalize_catalog_entity_name(ch.name) = i.term then 0 else 1
      end
    from public.characters ch
    cross join input i
    where i.kind in ('all', 'character')
      and i.term <> ''
      and exists (
        select 1 from public.anime_characters ac
        join public.anime a on a.id = ac.anime_id and a.is_published
        where ac.character_id = ch.id
      )
      and (
        starts_with(private.normalize_catalog_entity_name(ch.name), i.term)
        or starts_with(private.normalize_catalog_entity_name(ch.name_ja), i.term)
        or starts_with(private.normalize_catalog_entity_name(ch.name_kana), i.term)
        or starts_with(private.normalize_catalog_entity_name(ch.name_en), i.term)
        or starts_with(private.normalize_catalog_entity_name(ch.nickname), i.term)
        or starts_with(private.normalize_catalog_entity_name(ch.nickname_en), i.term)
        or exists (
          select 1 from public.catalog_entity_aliases cea
          where cea.entity_type = 'characters'
            and cea.entity_id = ch.id
            and starts_with(private.normalize_catalog_entity_name(cea.alias), i.term)
        )
      )

    union all

    select
      'studio'::text,
      st.id,
      coalesce(nullif(st.name_ja, ''), nullif(st.name, ''), nullif(st.name_kana, ''), nullif(st.name_en, '')),
      '制作会社'::text,
      case
        when private.normalize_catalog_entity_name(st.name_ja) = i.term
          or private.normalize_catalog_entity_name(st.name) = i.term then 0 else 1
      end
    from public.studios st
    cross join input i
    where i.kind in ('all', 'studio')
      and i.term <> ''
      and (
        exists (
          select 1 from public.anime_studios ast
          join public.anime a on a.id = ast.anime_id and a.is_published
          where ast.studio_id = st.id
        )
        or exists (
          select 1 from public.anime a
          where a.studio_id = st.id and a.is_published
        )
      )
      and (
        starts_with(private.normalize_catalog_entity_name(st.name), i.term)
        or starts_with(private.normalize_catalog_entity_name(st.name_ja), i.term)
        or starts_with(private.normalize_catalog_entity_name(st.name_kana), i.term)
        or starts_with(private.normalize_catalog_entity_name(st.name_en), i.term)
        or exists (
          select 1 from public.catalog_entity_aliases cea
          where cea.entity_type = 'studios'
            and cea.entity_id = st.id
            and starts_with(private.normalize_catalog_entity_name(cea.alias), i.term)
        )
      )

    union all

    select
      'organization'::text,
      org.id,
      coalesce(nullif(org.name_ja, ''), nullif(org.name, ''), nullif(org.name_kana, ''), nullif(org.name_en, '')),
      '組織'::text,
      case
        when private.normalize_catalog_entity_name(org.name_ja) = i.term
          or private.normalize_catalog_entity_name(org.name) = i.term then 0 else 1
      end
    from public.organizations org
    cross join input i
    where i.kind in ('all', 'organization')
      and i.term <> ''
      and exists (
        select 1 from public.anime_organization_staff aos
        join public.anime a on a.id = aos.anime_id and a.is_published
        where aos.organization_id = org.id
      )
      and (
        starts_with(private.normalize_catalog_entity_name(org.name), i.term)
        or starts_with(private.normalize_catalog_entity_name(org.name_ja), i.term)
        or starts_with(private.normalize_catalog_entity_name(org.name_kana), i.term)
        or starts_with(private.normalize_catalog_entity_name(org.name_en), i.term)
        or exists (
          select 1 from public.catalog_entity_aliases cea
          where cea.entity_type = 'organizations'
            and cea.entity_id = org.id
            and starts_with(private.normalize_catalog_entity_name(cea.alias), i.term)
        )
      )
  ),
  deduplicated as (
    select distinct on (c.suggestion_type, c.suggestion_id)
      c.suggestion_type, c.suggestion_id, c.label, c.detail, c.exact_rank
    from candidates c
    where c.label is not null and c.label <> ''
    order by c.suggestion_type, c.suggestion_id, c.exact_rank, c.label
  ),
  ranked as (
    select
      d.*,
      row_number() over (
        partition by d.suggestion_type
        order by d.exact_rank, lower(d.label), d.suggestion_id
      ) as type_position,
      case d.suggestion_type
        when 'anime' then 1
        when 'person' then 2
        when 'character' then 3
        when 'studio' then 4
        else 5
      end as type_order,
      i.kind,
      i.result_limit
    from deduplicated d
    cross join input i
  )
  select r.suggestion_type, r.suggestion_id, r.label, r.detail
  from ranked r
  where r.type_position <= case when r.kind = 'all' then 2 else r.result_limit end
  order by r.exact_rank, r.type_order, lower(r.label), r.suggestion_id
  limit (select result_limit from input);
$function$;

revoke all on function private.suggest_public_catalog(text, text, integer) from public, anon, authenticated;
grant usage on schema private to anon, authenticated;
grant execute on function private.suggest_public_catalog(text, text, integer) to anon, authenticated;

create or replace function public.suggest_public_catalog(
  p_query text,
  p_type text default 'all',
  p_limit integer default 10
)
returns table (
  suggestion_type text,
  suggestion_id uuid,
  label text,
  detail text
)
language sql
stable
security invoker
set search_path = ''
as $function$
  select *
  from private.suggest_public_catalog(p_query, p_type, p_limit);
$function$;

revoke all on function public.suggest_public_catalog(text, text, integer) from public;
grant execute on function public.suggest_public_catalog(text, text, integer) to anon, authenticated;

comment on function public.suggest_public_catalog(text, text, integer)
is 'Returns limited autocomplete suggestions for published anime and linked catalog entities; aliases are matched without exposing the alias table directly.';
