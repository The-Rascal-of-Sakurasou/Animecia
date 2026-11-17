-- Admin-only duplicate detection and guarded entity merge tools.
-- This migration intentionally does not merge anime records.

create or replace function private.normalize_catalog_entity_name(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    translate(lower(coalesce(p_value,'')),
      'ぁあぃいぅうぇえぉおかきくけこさしすせそたちっつてとなにぬねのはひふへほまみむめもゃやゅゆょよらりるれろわをん',
      'ァアィイゥウェエォオカキクケコサシスセソタチッツテトナニヌネノハヒフヘホマミムメモャヤュユョヨラリルレロワヲン'
    ),
    '[[:space:]・･,，.．…「」『』（）()【】\[\]＿_‐‑–—ー]+',
    '', 'g'
  );
$$;
revoke all on function private.normalize_catalog_entity_name(text) from public,anon,authenticated;

create table if not exists public.catalog_entity_aliases (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('people','characters','studios','organizations')),
  entity_id uuid not null,
  alias text not null check (length(btrim(alias)) > 0),
  language_code text,
  alias_type text not null default 'alternate_name',
  source_entity_id uuid,
  created_at timestamptz not null default now()
);
create unique index if not exists catalog_entity_aliases_entity_alias_key
  on public.catalog_entity_aliases(entity_type,entity_id,lower(alias));
create index if not exists catalog_entity_aliases_alias_idx
  on public.catalog_entity_aliases(lower(alias));
alter table public.catalog_entity_aliases enable row level security;
revoke all on public.catalog_entity_aliases from public,anon,authenticated;
grant all on public.catalog_entity_aliases to service_role;

create table if not exists public.catalog_entity_merge_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('people','characters','studios','organizations')),
  source_entity_id uuid not null,
  target_entity_id uuid not null,
  merged_by uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (source_entity_id <> target_entity_id)
);
alter table public.catalog_entity_merge_log enable row level security;
revoke all on public.catalog_entity_merge_log from public,anon,authenticated;
grant all on public.catalog_entity_merge_log to service_role;

create or replace function public.admin_get_entity_duplicate_candidates(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
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
revoke all on function public.admin_get_entity_duplicate_candidates(integer) from public,anon;
grant execute on function public.admin_get_entity_duplicate_candidates(integer) to authenticated,service_role;

create or replace function public.admin_merge_catalog_entity(p_entity_type text,p_source_id uuid,p_target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_table text;
  v_external_table text;
  v_external_column text;
  v_name_fields text[];
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
  if p_entity_type not in ('people','characters','studios','organizations') then
    raise exception 'Unsupported entity type';
  end if;
  if p_source_id is null or p_target_id is null or p_source_id=p_target_id then
    raise exception 'Two different entity IDs are required';
  end if;
  case p_entity_type
    when 'people' then v_table:='people'; v_external_table:='people_external_ids'; v_external_column:='person_id'; v_name_fields:=array['name','name_ja','name_kana','name_en','nickname','nickname_en'];
    when 'characters' then v_table:='characters'; v_external_table:='character_external_ids'; v_external_column:='character_id'; v_name_fields:=array['name','name_ja','name_kana','name_en','nickname','nickname_en'];
    when 'studios' then v_table:='studios'; v_external_table:='studio_external_ids'; v_external_column:='studio_id'; v_name_fields:=array['name','name_ja','name_kana','name_en'];
    when 'organizations' then v_table:='organizations'; v_external_table:='organization_external_ids'; v_external_column:='organization_id'; v_name_fields:=array['name','name_ja','name_kana','name_en'];
  end case;

  execute format('select to_jsonb(t) from public.%I t where t.id=$1 for update',v_table) into v_source using p_source_id;
  execute format('select to_jsonb(t) from public.%I t where t.id=$1 for update',v_table) into v_target using p_target_id;
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
    into v_set_clause from unnest(v_name_fields) f;
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
revoke all on function public.admin_merge_catalog_entity(text,uuid,uuid) from public,anon;
grant execute on function public.admin_merge_catalog_entity(text,uuid,uuid) to authenticated,service_role;
