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
