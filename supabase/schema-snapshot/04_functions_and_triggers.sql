CREATE OR REPLACE FUNCTION private.admin_get_entity_duplicate_candidates(p_limit integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_limit integer := greatest(1,least(coalesce(p_limit,100),100));
  v_result jsonb;
begin
  if not private.is_anixia_admin() then
    raise exception 'ANIXIA administrator permission required' using errcode='42501';
  end if;
  with entities as (
    select 'people'::text entity_type,p.id entity_id,
      coalesce(nullif(p.name_ja,''),nullif(p.name,''),'名称未設定') display_name,
      (select count(distinct s.anime_id)::integer from public.anime_staff s where s.person_id=p.id) related_works,
      coalesce((select jsonb_agg(jsonb_build_object('source',x.source,'external_id',x.external_id) order by x.source) from public.people_external_ids x where x.person_id=p.id),'[]'::jsonb) external_ids
    from public.people p
    union all
    select 'characters',p.id,coalesce(nullif(p.name_ja,''),nullif(p.name,''),'名称未設定'),
      (select count(distinct ac.anime_id)::integer from public.anime_characters ac where ac.character_id=p.id)
        + (select count(distinct s.anime_id)::integer from public.anime_staff s where s.character_id=p.id),
      coalesce((select jsonb_agg(jsonb_build_object('source',x.source,'external_id',x.external_id) order by x.source) from public.character_external_ids x where x.character_id=p.id),'[]'::jsonb)
    from public.characters p
    union all
    select 'studios',p.id,coalesce(nullif(p.name_ja,''),nullif(p.name,''),'名称未設定'),
      (select count(distinct s.anime_id)::integer from public.anime_studios s where s.studio_id=p.id)
        + (select count(*)::integer from public.anime a where a.studio_id=p.id and not exists(select 1 from public.anime_studios s where s.anime_id=a.id and s.studio_id=p.id)),
      coalesce((select jsonb_agg(jsonb_build_object('source',x.source,'external_id',x.external_id) order by x.source) from public.studio_external_ids x where x.studio_id=p.id),'[]'::jsonb)
    from public.studios p
    union all
    select 'organizations',p.id,coalesce(nullif(p.name_ja,''),nullif(p.name,''),'名称未設定'),
      (select count(distinct s.anime_id)::integer from public.anime_organization_staff s where s.organization_id=p.id),
      coalesce((select jsonb_agg(jsonb_build_object('source',x.source,'external_id',x.external_id) order by x.source) from public.organization_external_ids x where x.organization_id=p.id),'[]'::jsonb)
    from public.organizations p
  ),
  variants as (
    select 'people'::text entity_type,p.id entity_id,v.raw_name,private.normalize_catalog_entity_name(v.raw_name) normalized_name
    from public.people p cross join lateral (values (p.name),(p.name_ja),(p.name_kana),(p.name_en),(p.nickname),(p.nickname_en)) v(raw_name)
    where nullif(btrim(v.raw_name),'') is not null
    union all
    select 'characters',p.id,v.raw_name,private.normalize_catalog_entity_name(v.raw_name)
    from public.characters p cross join lateral (values (p.name),(p.name_ja),(p.name_kana),(p.name_en),(p.nickname),(p.nickname_en)) v(raw_name)
    where nullif(btrim(v.raw_name),'') is not null
    union all
    select 'studios',p.id,v.raw_name,private.normalize_catalog_entity_name(v.raw_name)
    from public.studios p cross join lateral (values (p.name),(p.name_ja),(p.name_kana),(p.name_en)) v(raw_name)
    where nullif(btrim(v.raw_name),'') is not null
    union all
    select 'organizations',p.id,v.raw_name,private.normalize_catalog_entity_name(v.raw_name)
    from public.organizations p cross join lateral (values (p.name),(p.name_ja),(p.name_kana),(p.name_en)) v(raw_name)
    where nullif(btrim(v.raw_name),'') is not null
    union all
    select a.entity_type,a.entity_id,a.alias,private.normalize_catalog_entity_name(a.alias)
    from public.catalog_entity_aliases a
  ),
  normalized as (select * from variants where length(normalized_name)>=3),
  pairs as (
    select a.entity_type,a.entity_id left_id,b.entity_id right_id,
      array_agg(distinct a.raw_name) matched_names,count(distinct a.normalized_name)::integer matched_name_count
    from normalized a join normalized b
      on b.entity_type=a.entity_type and b.normalized_name=a.normalized_name and a.entity_id<b.entity_id
    group by a.entity_type,a.entity_id,b.entity_id
  ),
  enriched as (
    select p.entity_type,p.left_id,p.right_id,l.display_name left_name,r.display_name right_name,
      l.related_works left_related_works,r.related_works right_related_works,
      l.external_ids left_external_ids,r.external_ids right_external_ids,
      p.matched_names,p.matched_name_count
    from pairs p
    join entities l on l.entity_type=p.entity_type and l.entity_id=p.left_id
    join entities r on r.entity_type=p.entity_type and r.entity_id=p.right_id
  )
  select jsonb_build_object(
    'generated_at',now(),'candidate_count',(select count(*) from enriched),
    'items',coalesce((select jsonb_agg(jsonb_build_object(
      'entity_type',entity_type,'left_id',left_id,'right_id',right_id,
      'left_name',left_name,'right_name',right_name,
      'left_related_works',left_related_works,'right_related_works',right_related_works,
      'left_external_ids',left_external_ids,'right_external_ids',right_external_ids,
      'matched_names',matched_names,'matched_name_count',matched_name_count
    ) order by entity_type,left_name,right_name)
    from (select * from enriched order by entity_type,left_name,right_name limit v_limit) limited),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$function$;

CREATE OR REPLACE FUNCTION private.admin_merge_catalog_entity(p_entity_type text, p_source_id uuid, p_target_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_table text;
  v_external_table text;
  v_external_column text;
  v_name_fields text[];
  v_merge_fields text[];
  v_source jsonb;
  v_target jsonb;
  v_set_clause text;
  v_conflicts integer;
  v_moved integer := 0;
  v_deleted integer := 0;
  v_source_staff record;
  v_target_staff_id uuid;
begin
  if not private.is_anixia_admin() then
    raise exception 'ANIXIA administrator permission required' using errcode='42501';
  end if;
  if p_entity_type is null or p_entity_type not in ('people','characters','studios','organizations') then
    raise exception 'Unsupported entity type';
  end if;
  if p_source_id is null or p_target_id is null or p_source_id=p_target_id then
    raise exception 'Two different entity IDs are required';
  end if;
  case p_entity_type
    when 'people' then
      v_table:='people'; v_external_table:='people_external_ids'; v_external_column:='person_id';
      v_name_fields:=array['name','name_ja','name_kana','name_en','nickname','nickname_en'];
      v_merge_fields:=v_name_fields||array['person_type','biography','image_url','official_url','wikipedia_url','birthday'];
    when 'characters' then
      v_table:='characters'; v_external_table:='character_external_ids'; v_external_column:='character_id';
      v_name_fields:=array['name','name_ja','name_kana','name_en','nickname','nickname_en'];
      v_merge_fields:=v_name_fields||array['description','image_url','description_en','series_id'];
    when 'studios' then
      v_table:='studios'; v_external_table:='studio_external_ids'; v_external_column:='studio_id';
      v_name_fields:=array['name','name_ja','name_kana','name_en'];
      v_merge_fields:=v_name_fields||array['website_url','wikipedia_url'];
    when 'organizations' then
      v_table:='organizations'; v_external_table:='organization_external_ids'; v_external_column:='organization_id';
      v_name_fields:=array['name','name_ja','name_kana','name_en'];
      v_merge_fields:=v_name_fields||array['website_url','wikipedia_url'];
  end case;

  execute format('select 1 from public.%I where id in ($1,$2) order by id for update',v_table)
    using p_source_id,p_target_id;
  execute format('select to_jsonb(t) from public.%I t where t.id=$1',v_table) into v_source using p_source_id;
  execute format('select to_jsonb(t) from public.%I t where t.id=$1',v_table) into v_target using p_target_id;
  if v_source is null or v_target is null then raise exception 'Source or target entity does not exist'; end if;

  execute format('select count(*) from public.%I s join public.%I t on t.%I=$2 and t.source=s.source where s.%I=$1 and t.external_id<>s.external_id',v_external_table,v_external_table,v_external_column,v_external_column)
    into v_conflicts using p_source_id,p_target_id;
  if v_conflicts>0 then raise exception 'External ID conflict: target already has a different ID from the same source. Resolve it before merging.'; end if;

  insert into public.catalog_entity_aliases(entity_type,entity_id,alias,language_code,alias_type,source_entity_id)
  select p_entity_type,p_target_id,btrim(value),
    case key when 'name_en' then 'en' when 'name_kana' then 'ja-Kana' else 'ja' end,
    'merged_name',p_source_id
  from jsonb_each_text(v_source)
  where key=any(v_name_fields) and nullif(btrim(value),'') is not null
  on conflict do nothing;

  delete from public.catalog_entity_aliases s
  where s.entity_type=p_entity_type and s.entity_id=p_source_id
    and exists(select 1 from public.catalog_entity_aliases t
      where t.entity_type=p_entity_type and t.entity_id=p_target_id and lower(t.alias)=lower(s.alias));
  update public.catalog_entity_aliases set entity_id=p_target_id
    where entity_type=p_entity_type and entity_id=p_source_id;

  select string_agg(format('%1$I = coalesce(nullif(%1$I, ''''), nullif(($1->>%2$L), ''''))',f,f),',')
    into v_set_clause from unnest(v_merge_fields) f;
  execute format('update public.%I set %s%s where id=$2',
    v_table,v_set_clause,case when v_table='studios' then '' else ', updated_at=now()' end)
    using v_source,p_target_id;

  execute format('update public.%I set %I=$2 where %I=$1',v_external_table,v_external_column,v_external_column)
    using p_source_id,p_target_id;

  if p_entity_type='people' then
    for v_source_staff in select id,anime_id,role,character_id from public.anime_staff where person_id=p_source_id loop
      select id into v_target_staff_id from public.anime_staff
      where anime_id=v_source_staff.anime_id and person_id=p_target_id
        and role=v_source_staff.role and character_id is not distinct from v_source_staff.character_id limit 1;
      if v_target_staff_id is not null then
        if exists(select 1 from public.anime_staff_external_ids s join public.anime_staff_external_ids t on t.source=s.source
          where s.anime_staff_id=v_source_staff.id and t.anime_staff_id=v_target_staff_id and t.external_id<>s.external_id) then
          raise exception 'Staff external ID conflict. Resolve it before merging.';
        end if;
        update public.anime_staff_external_ids set anime_staff_id=v_target_staff_id where anime_staff_id=v_source_staff.id;
        delete from public.anime_staff where id=v_source_staff.id;
        v_deleted:=v_deleted+1;
      else
        update public.anime_staff set person_id=p_target_id where id=v_source_staff.id;
        v_moved:=v_moved+1;
      end if;
      v_target_staff_id:=null;
    end loop;
  elsif p_entity_type='characters' then
    delete from public.anime_characters s using public.anime_characters t
      where s.character_id=p_source_id and t.character_id=p_target_id and t.anime_id=s.anime_id;
    get diagnostics v_deleted=row_count;
    for v_source_staff in select id,anime_id,person_id,role from public.anime_staff where character_id=p_source_id loop
      select id into v_target_staff_id from public.anime_staff
      where anime_id=v_source_staff.anime_id and person_id=v_source_staff.person_id
        and role=v_source_staff.role and character_id=p_target_id limit 1;
      if v_target_staff_id is not null then
        if exists(select 1 from public.anime_staff_external_ids s join public.anime_staff_external_ids t on t.source=s.source
          where s.anime_staff_id=v_source_staff.id and t.anime_staff_id=v_target_staff_id and t.external_id<>s.external_id) then
          raise exception 'Staff external ID conflict. Resolve it before merging.';
        end if;
        update public.anime_staff_external_ids set anime_staff_id=v_target_staff_id where anime_staff_id=v_source_staff.id;
        delete from public.anime_staff where id=v_source_staff.id;
        v_deleted:=v_deleted+1;
      else
        update public.anime_staff set character_id=p_target_id where id=v_source_staff.id;
        v_moved:=v_moved+1;
      end if;
      v_target_staff_id:=null;
    end loop;
    update public.anime_characters set character_id=p_target_id where character_id=p_source_id;
  elsif p_entity_type='studios' then
    delete from public.anime_studios s using public.anime_studios t
      where s.studio_id=p_source_id and t.studio_id=p_target_id
        and t.anime_id=s.anime_id and t.production_role=s.production_role;
    get diagnostics v_deleted=row_count;
    update public.anime_studios set studio_id=p_target_id where studio_id=p_source_id;
    get diagnostics v_moved=row_count;
    update public.anime set studio_id=p_target_id where studio_id=p_source_id;
  elsif p_entity_type='organizations' then
    delete from public.anime_organization_staff s using public.anime_organization_staff t
      where s.organization_id=p_source_id and t.organization_id=p_target_id
        and t.anime_id=s.anime_id and t.role=s.role;
    get diagnostics v_deleted=row_count;
    update public.anime_organization_staff set organization_id=p_target_id where organization_id=p_source_id;
    get diagnostics v_moved=row_count;
  end if;

  execute format('delete from public.%I where id=$1',v_table) using p_source_id;
  insert into public.catalog_entity_merge_log(entity_type,source_entity_id,target_entity_id,merged_by,details)
  values(p_entity_type,p_source_id,p_target_id,auth.uid(),jsonb_build_object('moved_relationships',v_moved,'deduplicated_relationships',v_deleted));
  return jsonb_build_object('success',true,'entity_type',p_entity_type,'source_id',p_source_id,'target_id',p_target_id,
    'moved_relationships',v_moved,'deduplicated_relationships',v_deleted);
end;
$function$;

CREATE OR REPLACE FUNCTION private.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.is_anixia_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM private.admin_users au
    WHERE au.user_id = (SELECT auth.uid())
  );
$function$;

CREATE OR REPLACE FUNCTION private.is_published_anime(p_anime_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.anime a
    WHERE a.id = p_anime_id AND a.is_published = true
  );
$function$;

CREATE OR REPLACE FUNCTION private.normalize_catalog_entity_name(p_value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select regexp_replace(
    translate(lower(coalesce(p_value,'')),
      'ぁあぃいぅうぇえぉおかきくけこさしすせそたちっつてとなにぬねのはひふへほまみむめもゃやゅゆょよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽゔゐゑ',
      'ァアィイゥウェエォオカキクケコサシスセソタチッツテトナニヌネノハヒフヘホマミムメモャヤュユョヨラリルレロワヲンガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポヴヰヱ'
    ),
    '[[:space:]・･,，.．…「」『』（）()【】\[\]＿_‐‑–—]+',
    '', 'g'
  );
$function$;

CREATE OR REPLACE FUNCTION private.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.suggest_public_catalog(p_query text, p_type text DEFAULT 'all'::text, p_limit integer DEFAULT 10)
 RETURNS TABLE(suggestion_type text, suggestion_id uuid, label text, detail text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

CREATE OR REPLACE FUNCTION public.admin_get_catalog_quality_report(p_limit integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    group by 1 having count(*) > 1
  ),
  issues as (
    select a.id as anime_id, 'anime'::text as entity_type, a.id as entity_id,
      case when a.is_published then 'critical' else 'warning' end as severity,
      'missing_japanese_title'::text as issue_code, '作品名'::text as field_name,
      '日本語タイトルが登録されていません。'::text as message,
      coalesce(nullif(a.title, ''), 'タイトル未設定') as display_title, a.is_published
    from public.anime a
    where nullif(btrim(a.title_ja), '') is null and nullif(btrim(a.title_kana), '') is null and nullif(btrim(a.title), '') is null
    union all
    select a.id,'anime',a.id,case when a.is_published then 'critical' else 'warning' end,
      'missing_synopsis','あらすじ','あらすじが登録されていません。',
      coalesce(nullif(a.title_ja,''),nullif(a.title_kana,''),a.title),a.is_published
    from public.anime a where nullif(btrim(a.synopsis),'') is null
    union all
    select a.id,'anime',a.id,'warning','missing_release_date','公開・放送時期','公開年または公開日が登録されていません。',
      coalesce(nullif(a.title_ja,''),nullif(a.title_kana,''),a.title),a.is_published
    from public.anime a where a.release_year is null and a.released_on is null
    union all
    select a.id,'anime',a.id,'info','missing_official_url','公式サイト','公式サイトURLが登録されていません（必須とは限りません）。',
      coalesce(nullif(a.title_ja,''),nullif(a.title_kana,''),a.title),a.is_published
    from public.anime a where nullif(btrim(a.official_url),'') is null and nullif(btrim(a.official_site_url),'') is null
    union all
    select a.id,'anime',a.id,'warning','invalid_official_url','公式サイト','公式サイトURLがhttp://またはhttps://で始まっていません。',
      coalesce(nullif(a.title_ja,''),nullif(a.title_kana,''),a.title),a.is_published
    from public.anime a
    where coalesce(nullif(btrim(a.official_url),''),nullif(btrim(a.official_site_url),'')) is not null
      and coalesce(nullif(btrim(a.official_url),''),nullif(btrim(a.official_site_url),'')) !~* '^https?://'
    union all
    select a.id,'anime',a.id,'warning','missing_genre','ジャンル','ジャンルが1件も設定されていません。',
      coalesce(nullif(a.title_ja,''),nullif(a.title_kana,''),a.title),a.is_published
    from public.anime a where not exists(select 1 from public.anime_genres ag where ag.anime_id=a.id)
    union all
    select a.id,'anime',a.id,'warning','suspicious_release_year','公開年','公開年が1900年より前、または現在から5年以上先です。誤入力でないか確認してください。',
      coalesce(nullif(a.title_ja,''),nullif(a.title_kana,''),a.title),a.is_published
    from public.anime a where a.release_year is not null and (a.release_year<1900 or a.release_year>extract(year from now())::integer+5)
    union all
    select a.id,'anime',a.id,'warning','duplicate_title_candidate','作品名','同じ正規化タイトルの作品が複数あります。続編・リメイク等の別作品か、重複登録かを確認してください。',
      coalesce(nullif(a.title_ja,''),nullif(a.title_kana,''),a.title),a.is_published
    from public.anime a join duplicate_titles d
      on d.normalized_title=lower(regexp_replace(btrim(coalesce(nullif(a.title_ja,''),nullif(a.title_kana,''),a.title)),'[[:space:]]+',' ','g'))
    union all
    select a.id,'anime',a.id,'info','episode_count_mismatch','話数','登録済みエピソード数と作品の話数情報が一致しません。未取得・特別編の有無も確認してください。',
      coalesce(nullif(a.title_ja,''),nullif(a.title_kana,''),a.title),a.is_published
    from public.anime a join lateral(select count(*)::integer as actual_count from public.episodes e where e.anime_id=a.id) ec on true
    where coalesce(a.episodes_count,a.episode_count) is not null and ec.actual_count>0 and ec.actual_count<>coalesce(a.episodes_count,a.episode_count)
    union all
    select a.id,'anime',a.id,'info','episodes_not_imported','エピソード','作品に話数情報がありますが、エピソード詳細がまだ登録されていません。',
      coalesce(nullif(a.title_ja,''),nullif(a.title_kana,''),a.title),a.is_published
    from public.anime a where coalesce(a.episodes_count,a.episode_count,0)>0 and not exists(select 1 from public.episodes e where e.anime_id=a.id)
    union all
    select a.id,'anime',a.id,case when a.is_published then 'critical' else 'warning' end,
      'missing_primary_studio','制作会社','制作会社が登録されていません。',
      coalesce(nullif(a.title_ja,''),nullif(a.title_kana,''),a.title),a.is_published
    from public.anime a where a.studio_id is null and not exists(select 1 from public.anime_studios ast where ast.anime_id=a.id)
    union all
    select e.anime_id,'episode',e.id,case when e.is_published then 'critical' else 'warning' end,
      'unknown_episode_kind','エピソード種別','エピソード種別が「不明」のままです。公開前に確認してください。',
      coalesce(nullif(a.title_ja,''),nullif(a.title_kana,''),a.title),e.is_published
    from public.episodes e join public.anime a on a.id=e.anime_id where e.episode_kind='unknown'
    union all
    select e.anime_id,'episode',e.id,case when e.is_published then 'critical' else 'warning' end,
      'episode_missing_title','エピソードタイトル','エピソードタイトルが登録されていません。',
      coalesce(nullif(a.title_ja,''),nullif(a.title_kana,''),a.title),e.is_published
    from public.episodes e join public.anime a on a.id=e.anime_id
    where nullif(btrim(e.title_ja),'') is null and nullif(btrim(e.title),'') is null
  )
  select jsonb_build_object(
    'generated_at',now(),
    'summary',jsonb_build_object(
      'anime_checked',(select count(*) from public.anime),
      'published_checked',(select count(*) from public.anime where is_published),
      'issue_count',(select count(*) from issues),
      'critical_count',(select count(*) from issues where severity='critical'),
      'warning_count',(select count(*) from issues where severity='warning'),
      'info_count',(select count(*) from issues where severity='info'),
      'affected_anime_count',(select count(distinct anime_id) from issues)
    ),
    'items',coalesce((
      select jsonb_agg(jsonb_build_object(
        'anime_id',anime_id,'entity_type',entity_type,'entity_id',entity_id,
        'severity',severity,'issue_code',issue_code,'field_name',field_name,
        'message',message,'display_title',display_title,'is_published',is_published
      ) order by case severity when 'critical' then 1 when 'warning' then 2 else 3 end,display_title,issue_code)
      from (select * from issues order by case severity when 'critical' then 1 when 'warning' then 2 else 3 end,display_title,issue_code limit v_limit) limited
    ),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_entity_duplicate_candidates(p_limit integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.admin_get_entity_duplicate_candidates(p_limit);
$function$;

CREATE OR REPLACE FUNCTION public.admin_merge_catalog_entity(p_entity_type text, p_source_id uuid, p_target_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.admin_merge_catalog_entity(p_entity_type,p_source_id,p_target_id);
$function$;

CREATE OR REPLACE FUNCTION public.admin_replace_anime_taxonomy(p_anime_id uuid, p_genre_ids uuid[] DEFAULT '{}'::uuid[], p_tag_ids uuid[] DEFAULT '{}'::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_public_anime_by_ids(p_anime_ids uuid[])
 RETURNS TABLE(id uuid, title text, title_ja text, title_kana text, format anime_format, release_year integer, season text, poster_url text, watchers_count integer, reviews_count integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT a.id, a.title, a.title_ja, a.title_kana, a.format, a.release_year,
    a.season, a.poster_url, a.watchers_count, a.reviews_count
  FROM public.anime a
  WHERE a.is_published = true
    AND a.id = ANY(coalesce(p_anime_ids, ARRAY[]::uuid[]))
  ORDER BY array_position(p_anime_ids, a.id)
  LIMIT 100;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_anime_detail(p_anime_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
        'image_url', c.image_url, 'description', c.description, 'role', ac.role, 'voice_actors', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', p.id, 'name', p.name, 'name_ja', p.name_ja
        ) order by p.name_ja nulls last, p.name)
        from public.anime_staff ast
        join public.people p on p.id = ast.person_id
        where ast.anime_id = ac.anime_id
          and ast.character_id = c.id
          and ast.role = 'voice_actor'
      ), '[]'::jsonb)
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

CREATE OR REPLACE FUNCTION public.is_anixia_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  SELECT private.is_anixia_admin();
$function$;

CREATE OR REPLACE FUNCTION public.recommend_public_anime(p_genre_ids uuid[] DEFAULT ARRAY[]::uuid[], p_format anime_format DEFAULT NULL::anime_format, p_year integer DEFAULT NULL::integer, p_season text DEFAULT NULL::text, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, title text, title_ja text, title_kana text, format anime_format, release_year integer, season text, poster_url text, watchers_count integer, reviews_count integer, match_count integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  WITH genre_matches AS (
    SELECT ag.anime_id, count(*)::integer AS matches
    FROM public.anime_genres ag
    WHERE ag.genre_id = ANY(coalesce(p_genre_ids, ARRAY[]::uuid[]))
    GROUP BY ag.anime_id
  )
  SELECT a.id, a.title, a.title_ja, a.title_kana, a.format, a.release_year,
    a.season, a.poster_url, a.watchers_count, a.reviews_count,
    coalesce(gm.matches, 0)::integer AS match_count
  FROM public.anime a
  LEFT JOIN genre_matches gm ON gm.anime_id = a.id
  WHERE a.is_published = true
    AND (cardinality(coalesce(p_genre_ids, ARRAY[]::uuid[])) = 0 OR gm.matches > 0)
    AND (p_format IS NULL OR a.format = p_format)
    AND (p_year IS NULL OR a.release_year = p_year)
    AND (p_season IS NULL OR a.season = p_season)
  ORDER BY coalesce(gm.matches, 0) DESC, coalesce(a.watchers_count, 0) DESC, coalesce(a.reviews_count, 0) DESC
  LIMIT least(greatest(coalesce(p_limit, 20), 1), 30);
$function$;

CREATE OR REPLACE FUNCTION public.search_public_anime(p_query text, p_genre_id uuid, p_year integer, p_season text, p_format anime_format, p_studio_id uuid, p_sort text, p_limit integer, p_offset integer, p_tag_ids uuid[], p_person_query text, p_character_query text)
 RETURNS TABLE(id uuid, title text, title_ja text, title_kana text, synopsis text, format anime_format, release_year integer, season text, episode_count integer, poster_url text, watchers_count integer, reviews_count integer, studio_id uuid, average_score numeric, rating_count bigint, total_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
        or exists (
          select 1
          from public.anime_staff ast
          join public.people pe on pe.id = ast.person_id
          where ast.anime_id = a.id
            and (
              strpos(lower(coalesce(pe.name, '')), lower(left(trim(p_query), 80))) > 0
              or strpos(lower(coalesce(pe.name_ja, '')), lower(left(trim(p_query), 80))) > 0
              or strpos(lower(coalesce(pe.name_kana, '')), lower(left(trim(p_query), 80))) > 0
              or strpos(lower(coalesce(pe.name_en, '')), lower(left(trim(p_query), 80))) > 0
              or strpos(lower(coalesce(pe.nickname, '')), lower(left(trim(p_query), 80))) > 0
              or strpos(lower(coalesce(pe.nickname_en, '')), lower(left(trim(p_query), 80))) > 0
              or exists (
                select 1 from public.catalog_entity_aliases cea
                where cea.entity_type = 'people'
                  and cea.entity_id = pe.id
                  and strpos(lower(cea.alias), lower(left(trim(p_query), 80))) > 0
              )
            )
        )
        or exists (
          select 1
          from public.anime_characters ac
          join public.characters ch on ch.id = ac.character_id
          where ac.anime_id = a.id
            and (
              strpos(lower(coalesce(ch.name, '')), lower(left(trim(p_query), 80))) > 0
              or strpos(lower(coalesce(ch.name_ja, '')), lower(left(trim(p_query), 80))) > 0
              or strpos(lower(coalesce(ch.name_kana, '')), lower(left(trim(p_query), 80))) > 0
              or strpos(lower(coalesce(ch.name_en, '')), lower(left(trim(p_query), 80))) > 0
              or strpos(lower(coalesce(ch.nickname, '')), lower(left(trim(p_query), 80))) > 0
              or strpos(lower(coalesce(ch.nickname_en, '')), lower(left(trim(p_query), 80))) > 0
              or exists (
                select 1 from public.catalog_entity_aliases cea
                where cea.entity_type = 'characters'
                  and cea.entity_id = ch.id
                  and strpos(lower(cea.alias), lower(left(trim(p_query), 80))) > 0
              )
            )
        )
        or exists (
          select 1
          from (
            select a.studio_id as studio_id
            where a.studio_id is not null
            union
            select ast.studio_id
            from public.anime_studios ast
            where ast.anime_id = a.id
          ) linked_studios
          join public.studios st on st.id = linked_studios.studio_id
          where (
            strpos(lower(coalesce(st.name, '')), lower(left(trim(p_query), 80))) > 0
            or strpos(lower(coalesce(st.name_ja, '')), lower(left(trim(p_query), 80))) > 0
            or strpos(lower(coalesce(st.name_kana, '')), lower(left(trim(p_query), 80))) > 0
            or strpos(lower(coalesce(st.name_en, '')), lower(left(trim(p_query), 80))) > 0
            or exists (
              select 1 from public.catalog_entity_aliases cea
              where cea.entity_type = 'studios'
                and cea.entity_id = st.id
                and strpos(lower(cea.alias), lower(left(trim(p_query), 80))) > 0
            )
          )
        )
        or exists (
          select 1
          from public.anime_organization_staff aos
          join public.organizations org on org.id = aos.organization_id
          where aos.anime_id = a.id
            and (
              strpos(lower(coalesce(org.name, '')), lower(left(trim(p_query), 80))) > 0
              or strpos(lower(coalesce(org.name_ja, '')), lower(left(trim(p_query), 80))) > 0
              or strpos(lower(coalesce(org.name_kana, '')), lower(left(trim(p_query), 80))) > 0
              or strpos(lower(coalesce(org.name_en, '')), lower(left(trim(p_query), 80))) > 0
              or exists (
                select 1 from public.catalog_entity_aliases cea
                where cea.entity_type = 'organizations'
                  and cea.entity_id = org.id
                  and strpos(lower(cea.alias), lower(left(trim(p_query), 80))) > 0
              )
            )
        )
      )
      and (
        p_genre_id is null
        or exists (
          select 1 from public.anime_genres ag
          where ag.anime_id = a.id and ag.genre_id = p_genre_id
        )
      )
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
              or exists (
                select 1 from public.catalog_entity_aliases cea
                where cea.entity_type = 'people'
                  and cea.entity_id = pe.id
                  and strpos(lower(cea.alias), lower(left(trim(p_person_query), 80))) > 0
              )
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
              or exists (
                select 1 from public.catalog_entity_aliases cea
                where cea.entity_type = 'characters'
                  and cea.entity_id = ch.id
                  and strpos(lower(cea.alias), lower(left(trim(p_character_query), 80))) > 0
              )
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

CREATE OR REPLACE FUNCTION public.search_public_anime(p_query text DEFAULT NULL::text, p_genre_id uuid DEFAULT NULL::uuid, p_year integer DEFAULT NULL::integer, p_season text DEFAULT NULL::text, p_format anime_format DEFAULT NULL::anime_format, p_studio_id uuid DEFAULT NULL::uuid, p_sort text DEFAULT 'newest'::text, p_limit integer DEFAULT 24, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, title text, title_ja text, title_kana text, synopsis text, format anime_format, release_year integer, season text, episode_count integer, poster_url text, watchers_count integer, reviews_count integer, studio_id uuid, average_score numeric, rating_count bigint, total_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
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

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(p_user_id uuid, p_quiz_id uuid, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_attempt_id uuid;
  v_question record;
  v_answer jsonb;
  v_choice_id uuid;
  v_correct_choice_id uuid;
  v_score integer := 0;
  v_max_score integer := 0;
  v_question_count integer := 0;
  v_is_correct boolean;
BEGIN
  IF p_user_id IS NULL OR p_quiz_id IS NULL THEN RAISE EXCEPTION 'Missing user or quiz identifier'; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_user_id) THEN RAISE EXCEPTION 'User not found'; END IF;
  IF jsonb_typeof(p_answers) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Answers must be an array'; END IF;
  IF jsonb_array_length(p_answers) > 100 THEN RAISE EXCEPTION 'Too many answers'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = p_quiz_id AND q.is_published = true) THEN RAISE EXCEPTION 'Quiz is not available'; END IF;

  SELECT count(*)::integer, coalesce(sum(qq.points), 0)::integer
    INTO v_question_count, v_max_score
  FROM public.quiz_questions qq WHERE qq.quiz_id = p_quiz_id;
  IF v_question_count = 0 THEN RAISE EXCEPTION 'Quiz has no questions'; END IF;
  IF jsonb_array_length(p_answers) <> v_question_count THEN RAISE EXCEPTION 'Answer count does not match question count'; END IF;

  INSERT INTO public.quiz_attempts (user_id, quiz_id, score, max_score, completed_at)
  VALUES (p_user_id, p_quiz_id, 0, v_max_score, now())
  RETURNING id INTO v_attempt_id;

  FOR v_question IN
    SELECT qq.id, qq.points FROM public.quiz_questions qq
    WHERE qq.quiz_id = p_quiz_id ORDER BY qq.question_order
  LOOP
    SELECT item.value INTO v_answer
    FROM jsonb_array_elements(p_answers) AS item(value)
    WHERE item.value->>'question_id' = v_question.id::text
    LIMIT 1;
    IF v_answer IS NULL THEN RAISE EXCEPTION 'Missing answer for question %', v_question.id; END IF;

    v_choice_id := nullif(v_answer->>'selected_choice_id', '')::uuid;
    IF v_choice_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.quiz_choices qc
      WHERE qc.id = v_choice_id AND qc.question_id = v_question.id
    ) THEN RAISE EXCEPTION 'Selected choice does not belong to question'; END IF;

    SELECT qak.correct_choice_id INTO v_correct_choice_id
    FROM private.quiz_answer_keys qak WHERE qak.question_id = v_question.id;
    IF v_correct_choice_id IS NULL THEN RAISE EXCEPTION 'Answer key is not configured for question %', v_question.id; END IF;

    v_is_correct := (v_choice_id IS NOT NULL AND v_choice_id = v_correct_choice_id);
    IF v_is_correct THEN v_score := v_score + v_question.points; END IF;
    INSERT INTO public.quiz_answers (attempt_id, question_id, selected_choice_id, is_correct)
    VALUES (v_attempt_id, v_question.id, v_choice_id, v_is_correct);
  END LOOP;

  UPDATE public.quiz_attempts
  SET score = v_score, max_score = v_max_score, completed_at = now()
  WHERE id = v_attempt_id;

  RETURN jsonb_build_object('attempt_id', v_attempt_id, 'score', v_score, 'max_score', v_max_score);
END;
$function$;

CREATE OR REPLACE FUNCTION public.suggest_public_catalog(p_query text, p_type text DEFAULT 'all'::text, p_limit integer DEFAULT 10)
 RETURNS TABLE(suggestion_type text, suggestion_id uuid, label text, detail text)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
begin
  if char_length(trim(coalesce(p_query, ''))) < 2 then
    return;
  end if;

  return query
  select *
  from private.suggest_public_catalog(p_query, p_type, p_limit);
end;
$function$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON anime FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON characters FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON people FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON quiz_attempts FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON quizzes FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON ratings FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON watch_entries FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
