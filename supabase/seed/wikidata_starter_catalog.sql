-- Idempotent starter seed for Wikidata structured catalog facts.
-- Scope: titles, aliases, release dates, episode counts, official URLs and QIDs only.
-- Do not add posters, banners, images, or copied prose descriptions from Wikidata pages.

insert into public.catalog_sources
  (code,display_name,website_url,api_docs_url,terms_url,rights_review_status,rights_reviewed_at,rights_notes,is_enabled)
values
  ('wikidata','Wikidata (CC0)','https://www.wikidata.org/','https://www.wikidata.org/wiki/Wikidata:Data_access','https://www.wikidata.org/wiki/Wikidata:Reuse','approved',now(),
   'Structured Wikidata data is CC0. ANIXIA imports only structured catalog facts, titles, dates, episode counts and Wikidata identifiers. No images, posters, banners or copied prose descriptions are imported. Attribution is provided in ANIXIA credits as recommended by Wikidata. Requests must follow Wikidata access best practices and avoid excessive load.',true)
on conflict (code) do update set
  display_name=excluded.display_name,website_url=excluded.website_url,api_docs_url=excluded.api_docs_url,
  terms_url=excluded.terms_url,rights_review_status='approved',rights_reviewed_at=now(),
  rights_notes=excluded.rights_notes,is_enabled=true,updated_at=now();

with seed(source_id,title,title_ja,title_kana,release_year,released_on,episode_count,official_url) as (
  values
    ('Q662','Neon Genesis Evangelion','新世紀エヴァンゲリオン',null::text,1995,date '1995-10-04',26,'http://www.evangelion.co.jp/index.html'),
    ('Q53353','Puella Magi Madoka Magica','魔法少女まどか☆マギカ','まほうしょうじょまどかマギカ',2011,date '2011-01-07',12,'https://www.madoka-magica.com/tv/'),
    ('Q239937','Pokémon','ポケットモンスター',null::text,1997,date '1997-04-01',null::integer,'https://www.tv-tokyo.co.jp/anime/pokemon/'),
    ('Q101244908','Cowboy Bebop','カウボーイビバップ',null::text,1998,date '1998-04-03',26,null::text)
)
insert into public.anime
  (source,source_id,title,title_ja,title_kana,format,release_year,released_on,episode_count,episodes_count,
   official_url,official_site_url,country_code,is_published,source_synced_at)
select 'wikidata',s.source_id,s.title,s.title_ja,s.title_kana,'tv',s.release_year,s.released_on,s.episode_count,s.episode_count,
       s.official_url,s.official_url,'JP',true,now()
from seed s
on conflict (source,source_id) do nothing;

insert into public.anime_external_ids(anime_id,source,external_id,source_url,is_primary,last_verified_at)
select a.id,'wikidata',s.source_id,'https://www.wikidata.org/wiki/'||s.source_id,true,now()
from public.anime a
join (values ('Q662'),('Q53353'),('Q239937'),('Q101244908')) as s(source_id)
  on a.source='wikidata' and a.source_id=s.source_id
on conflict (anime_id,source) do update set
  external_id=excluded.external_id,source_url=excluded.source_url,is_primary=true,last_verified_at=now();

insert into public.anime_titles(anime_id,title,language_code,title_type,is_primary)
select a.id,v.title,v.language_code,'synonym',false
from public.anime a
join (values
  ('Q662','Shinseiki Evangelion','en'),('Q662','Shin Seiki Evangelion','en'),
  ('Q662','Evangelion','en'),('Q662','NGE','en'),('Q662','Eva','en'),
  ('Q53353','Madoka Magica','en'),('Q53353','MadoMagi','en'),('Q53353','PMMM','en'),('Q53353','まどマギ','ja'),
  ('Q239937','Pokemon','en'),('Q239937','Pocket Monsters','en'),
  ('Q239937','Pokémon: The Series','en'),('Q239937','Pokémon the Series','en'),
  ('Q101244908','カウボーイ ビバップ','ja')
) as v(source_id,title,language_code)
  on a.source='wikidata' and a.source_id=v.source_id
on conflict do nothing;


-- Second verified batch (2026-11-17): five additional TV anime works.
with seed(source_id,title,title_ja,title_kana,release_year,released_on,episode_count) as (
  values
    ('Q20590069','Steins;Gate','STEINS;GATE',null::text,2011,date '2011-04-06',26),
    ('Q483943','Anohana','あの日見た花の名前を僕達はまだ知らない。',null::text,2011,date '2011-04-14',11),
    ('Q531552','Angel Beats!',null::text,null::text,2010,date '2010-04-02',13),
    ('Q102126892','Mushoku Tensei','無職転生 〜異世界行ったら本気だす〜','むしょくてんせい 〜いせかいいったらほんきだす〜',2021,date '2021-01-11',null::integer),
    ('Q65086934','Re:Zero','Re:ゼロから始める異世界生活',null::text,2016,date '2016-04-04',null::integer)
)
insert into public.anime
  (source,source_id,title,title_ja,title_kana,format,release_year,released_on,episode_count,episodes_count,country_code,is_published,source_synced_at)
select 'wikidata',s.source_id,s.title,s.title_ja,s.title_kana,'tv',s.release_year,s.released_on,s.episode_count,s.episode_count,'JP',true,now()
from seed s
on conflict (source,source_id) do nothing;

insert into public.anime_external_ids(anime_id,source,external_id,source_url,is_primary,last_verified_at)
select a.id,'wikidata',a.source_id,'https://www.wikidata.org/wiki/'||a.source_id,true,now()
from public.anime a
where a.source='wikidata' and a.source_id in ('Q20590069','Q483943','Q531552','Q102126892','Q65086934')
on conflict (anime_id,source) do update set
 external_id=excluded.external_id,source_url=excluded.source_url,is_primary=true,last_verified_at=now();

insert into public.anime_titles(anime_id,title,language_code,title_type,is_primary)
select a.id,v.title,v.language_code,v.title_type,false
from public.anime a
join (values
 ('Q20590069','Steins;Gate','en','synonym'),('Q20590069','STEINS;GATE','ja','main'),
 ('Q483943','あの日見た花の名前を僕達はまだ知らない。','ja','main'),
 ('Q483943','Ano Hi Mita Hana no Namae o Bokutachi wa Mada Shiranai','en','synonym'),
 ('Q483943','Anohana: The Flower We Saw That Day','en','synonym'),
 ('Q531552','Angel Beats!','en','main'),
 ('Q102126892','無職転生 〜異世界行ったら本気だす〜','ja','main'),
 ('Q102126892','Mushoku Tensei: Isekai Ittara Honki Dasu','en','synonym'),
 ('Q102126892','Mushoku Tensei: Jobless Reincarnation','en','synonym'),
 ('Q65086934','Re:ゼロから始める異世界生活','ja','main'),
 ('Q65086934','リゼロ','ja','short'),
 ('Q65086934','Re:Zero kara Hajimeru Isekai Seikatsu','en','synonym'),
 ('Q65086934','Re:Zero − Starting Life in Another World','en','synonym')
) as v(source_id,title,language_code,title_type)
  on a.source='wikidata' and a.source_id=v.source_id
on conflict do nothing;

-- Studio records and verified work-to-studio relationships.
insert into public.studios(name,name_ja,name_kana,name_en,website_url,source,source_id)
values
 ('A-1 Pictures','A-1 Pictures','エー・ワン・ピクチャーズ','A-1 Pictures','https://a1p.jp/','wikidata','Q277763'),
 ('Studio Bind','スタジオバインド','スタジオバインド','Studio Bind','https://st-bind.jp/','wikidata','Q71811168')
on conflict (source,source_id) do nothing;

insert into public.studio_external_ids(studio_id,source,external_id,source_url,last_verified_at)
select s.id,'wikidata',s.source_id,'https://www.wikidata.org/wiki/'||s.source_id,now()
from public.studios s
where s.source='wikidata' and s.source_id in ('Q277763','Q71811168')
on conflict do nothing;

insert into public.anime_studios(anime_id,studio_id,production_role,display_order)
select a.id,s.id,'animation',1
from public.anime a
join public.studios s on
 (a.source_id='Q483943' and s.source_id='Q277763')
 or (a.source_id='Q102126892' and s.source_id='Q71811168')
where a.source='wikidata'
on conflict do nothing;


-- Verified Anohana staff records. No images or biography prose are imported.
insert into public.people(name,name_ja,name_kana,name_en,person_type,source,source_id)
values
 ('Tatsuyuki Nagai','長井龍雪','ながい たつゆき','Tatsuyuki Nagai','director','wikidata','Q1073727'),
 ('Mari Okada','岡田麿里','おかだ まり','Mari Okada','screenwriter','wikidata','Q3209229')
on conflict (source,source_id) do nothing;

insert into public.people_external_ids(person_id,source,external_id,source_url,last_verified_at)
select p.id,'wikidata',p.source_id,'https://www.wikidata.org/wiki/'||p.source_id,now()
from public.people p
where p.source='wikidata' and p.source_id in ('Q1073727','Q3209229')
on conflict do nothing;

insert into public.anime_staff(anime_id,person_id,role)
select a.id,p.id,v.role
from (values
 ('Q483943','Q1073727','director'),
 ('Q483943','Q3209229','screenwriter')
) v(anime_qid,person_qid,role)
join public.anime a on a.source='wikidata' and a.source_id=v.anime_qid
join public.people p on p.source='wikidata' and p.source_id=v.person_qid
where not exists (
  select 1 from public.anime_staff existing
  where existing.anime_id=a.id
    and existing.person_id=p.id
    and existing.role=v.role
    and existing.character_id is null
);
