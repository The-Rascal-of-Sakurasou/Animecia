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
    ('Q531552','Angel Beats!','Angel Beats!',null::text,2010,date '2010-04-02',13),
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


-- Third verified staff batch (2026-11-17): directors and screenwriters.
-- Roles are copied only where the corresponding Wikidata work item explicitly lists them.
insert into public.people(name,name_ja,name_kana,name_en,person_type,source,source_id)
values
 ('Hideaki Anno','庵野秀明','あんの ひであき','Hideaki Anno','director','wikidata','Q23261'),
 ('Akiyuki Shinbo','新房昭之','しんぼう あきゆき','Akiyuki Shinbo','director','wikidata','Q50036'),
 ('Gen Urobuchi','虚淵玄','うろぶち げん','Gen Urobuchi','screenwriter','wikidata','Q50038'),
 ('Jun Maeda','麻枝准','まえだ じゅん','Jun Maeda','screenwriter','wikidata','Q683407')
on conflict (source,source_id) do nothing;

insert into public.people_external_ids(person_id,source,external_id,source_url,last_verified_at)
select p.id,'wikidata',p.source_id,'https://www.wikidata.org/wiki/'||p.source_id,now()
from public.people p
where p.source='wikidata' and p.source_id in ('Q23261','Q50036','Q50038','Q683407')
on conflict do nothing;

insert into public.anime_staff(anime_id,person_id,role)
select a.id,p.id,v.role
from (values
 ('Q662','Q23261','director'),
 ('Q662','Q23261','screenwriter'),
 ('Q53353','Q50036','director'),
 ('Q53353','Q50038','screenwriter'),
 ('Q531552','Q683407','screenwriter')
) v(anime_qid,person_qid,role)
join public.anime a on a.source='wikidata' and a.source_id=v.anime_qid
join public.people p on p.source='wikidata' and p.source_id=v.person_qid
where not exists (
 select 1 from public.anime_staff existing
 where existing.anime_id=a.id and existing.person_id=p.id
   and existing.role=v.role and existing.character_id is null
);

-- Fourth verified batch (2026-11-17): Evangelion main characters and Japanese voice actors.
-- Character-to-voice-actor credits are stored as anime_staff rows with character_id.
insert into public.people(name,name_ja,name_kana,name_en,person_type,source,source_id)
values
 ('Megumi Ogata','緒方恵美','おがた めぐみ','Megumi Ogata','voice_actor','wikidata','Q254368'),
 ('Megumi Hayashibara','林原めぐみ','はやしばら めぐみ','Megumi Hayashibara','voice_actor','wikidata','Q266670')
on conflict (source,source_id) do nothing;

insert into public.people_external_ids(person_id,source,external_id,source_url,last_verified_at)
select p.id,'wikidata',p.source_id,'https://www.wikidata.org/wiki/'||p.source_id,now()
from public.people p
where p.source='wikidata' and p.source_id in ('Q254368','Q266670')
on conflict do nothing;

insert into public.characters(name,name_ja,name_kana,name_en,source,source_id)
values
 ('Shinji Ikari','碇シンジ','いかり しんじ','Shinji Ikari','wikidata','Q1143582'),
 ('Rei Ayanami','綾波レイ','あやなみ れい','Rei Ayanami','wikidata','Q1140524')
on conflict (source,source_id) do nothing;

insert into public.character_external_ids(character_id,source,external_id,source_url,last_verified_at)
select c.id,'wikidata',c.source_id,'https://www.wikidata.org/wiki/'||c.source_id,now()
from public.characters c
where c.source='wikidata' and c.source_id in ('Q1143582','Q1140524')
on conflict do nothing;

insert into public.anime_characters(anime_id,character_id,role)
select a.id,c.id,'main'
from public.anime a
join public.characters c on c.source='wikidata' and c.source_id in ('Q1143582','Q1140524')
where a.source='wikidata' and a.source_id='Q662'
on conflict (anime_id,character_id) do nothing;

insert into public.anime_staff(anime_id,person_id,role,character_id)
select a.id,p.id,'voice_actor',c.id
from (values ('Q1143582','Q254368'),('Q1140524','Q266670')) v(character_qid,person_qid)
join public.anime a on a.source='wikidata' and a.source_id='Q662'
join public.characters c on c.source='wikidata' and c.source_id=v.character_qid
join public.people p on p.source='wikidata' and p.source_id=v.person_qid
where not exists (
 select 1 from public.anime_staff s
 where s.anime_id=a.id and s.person_id=p.id and s.role='voice_actor' and s.character_id=c.id
);


-- Fifth curated batch (2026-11-17): selected lead characters and Japanese voice cast.
-- Actor identities use Wikidata QIDs. Character keys are ANIXIA-internal IDs,
-- not external Wikidata identifiers; role mappings are documented with source links.
insert into public.people(name,name_ja,name_kana,name_en,person_type,source,source_id)
values
 ('Asami Imai','今井麻美','いまい あさみ','Asami Imai','voice_actor','wikidata','Q1042804'),
 ('Yumi Uchiyama','内山夕実','うちやま ゆみ','Yumi Uchiyama','voice_actor','wikidata','Q322979'),
 ('Yusuke Kobayashi','小林裕介','こばやし ゆうすけ','Yusuke Kobayashi','voice_actor','wikidata','Q17158282'),
 ('Koichi Yamadera','山寺宏一','やまでら こういち','Koichi Yamadera','voice_actor','wikidata','Q333194'),
 ('Rica Matsumoto','松本梨香','まつもと りか','Rica Matsumoto','voice_actor','wikidata','Q943714')
on conflict (source,source_id) do nothing;

insert into public.people_external_ids(person_id,source,external_id,source_url,last_verified_at)
select p.id,'wikidata',p.source_id,'https://www.wikidata.org/wiki/'||p.source_id,now()
from public.people p
where p.source='wikidata'
  and p.source_id in ('Q1042804','Q322979','Q17158282','Q333194','Q943714')
on conflict do nothing;

insert into public.characters(name,name_ja,name_kana,name_en,source,source_id)
select v.name,v.name_ja,v.name_kana,v.name_en,'anixia_curated',v.internal_key
from (values
 ('Kurisu Makise','牧瀬紅莉栖','まきせ くりす','Kurisu Makise','anixia:steins-gate:kurisu'),
 ('Rudeus Greyrat','ルーデウス・グレイラット','るーでうす ぐれいらっと','Rudeus Greyrat','anixia:mushoku-tensei:rudeus'),
 ('Subaru Natsuki','ナツキ・スバル','なつき すばる','Subaru Natsuki','anixia:rezero:subaru'),
 ('Spike Spiegel','スパイク・スピーゲル','すぱいく すぴーげる','Spike Spiegel','anixia:cowboy-bebop:spike'),
 ('Satoshi','サトシ','さとし','Ash Ketchum','anixia:pokemon:satoshi')
) v(name,name_ja,name_kana,name_en,internal_key)
where not exists (
 select 1 from public.characters c
 where c.source='anixia_curated' and c.source_id=v.internal_key
);

insert into public.anime_characters(anime_id,character_id,role)
select a.id,c.id,'main'
from (values
 ('Q20590069','anixia:steins-gate:kurisu'),
 ('Q102126892','anixia:mushoku-tensei:rudeus'),
 ('Q65086934','anixia:rezero:subaru'),
 ('Q101244908','anixia:cowboy-bebop:spike'),
 ('Q239937','anixia:pokemon:satoshi')
) v(anime_qid,character_key)
join public.anime a on a.source='wikidata' and a.source_id=v.anime_qid
join public.characters c on c.source='anixia_curated' and c.source_id=v.character_key
where not exists (
 select 1 from public.anime_characters ac
 where ac.anime_id=a.id and ac.character_id=c.id
);

insert into public.anime_staff(anime_id,person_id,role,character_id)
select a.id,p.id,'voice_actor',c.id
from (values
 ('Q20590069','anixia:steins-gate:kurisu','Q1042804'),
 ('Q102126892','anixia:mushoku-tensei:rudeus','Q322979'),
 ('Q65086934','anixia:rezero:subaru','Q17158282'),
 ('Q101244908','anixia:cowboy-bebop:spike','Q333194'),
 ('Q239937','anixia:pokemon:satoshi','Q943714')
) v(anime_qid,character_key,person_qid)
join public.anime a on a.source='wikidata' and a.source_id=v.anime_qid
join public.characters c on c.source='anixia_curated' and c.source_id=v.character_key
join public.people p on p.source='wikidata' and p.source_id=v.person_qid
where not exists (
 select 1 from public.anime_staff s
 where s.anime_id=a.id and s.person_id=p.id and s.role='voice_actor' and s.character_id=c.id
);


-- Sixth curated batch (2026-11-17): official main casts for Anohana and Angel Beats!.
-- People and characters use ANIXIA internal keys; no external QIDs are asserted.
insert into public.people(name,name_ja,name_kana,name_en,person_type,source,source_id)
values
 ('Miyu Irino','入野自由','いりの みゆ','Miyu Irino','voice_actor','anixia_curated','anixia:voice-actor:miyu-irino'),
 ('Ai Kayano','茅野愛衣','かやの あい','Ai Kayano','voice_actor','anixia_curated','anixia:voice-actor:ai-kayano'),
 ('Haruka Tomatsu','戸松遥','とまつ はるか','Haruka Tomatsu','voice_actor','anixia_curated','anixia:voice-actor:haruka-tomatsu'),
 ('Takahiro Sakurai','櫻井孝宏','さくらい たかひろ','Takahiro Sakurai','voice_actor','anixia_curated','anixia:voice-actor:takahiro-sakurai'),
 ('Saori Hayami','早見沙織','はやみ さおり','Saori Hayami','voice_actor','anixia_curated','anixia:voice-actor:saori-hayami'),
 ('Takayuki Kondo','近藤孝行','こんどう たかゆき','Takayuki Kondo','voice_actor','anixia_curated','anixia:voice-actor:takayuki-kondo'),
 ('Hiroshi Kamiya','神谷浩史','かみや ひろし','Hiroshi Kamiya','voice_actor','anixia_curated','anixia:voice-actor:hiroshi-kamiya'),
 ('Hiromi Sakurai','櫻井浩美','さくらい はるみ','Hiromi Sakurai','voice_actor','anixia_curated','anixia:voice-actor:hiromi-sakurai'),
 ('Kana Hanazawa','花澤香菜','はなざわ かな','Kana Hanazawa','voice_actor','anixia_curated','anixia:voice-actor:kana-hanazawa'),
 ('Eri Kitamura','喜多村英梨','きたむら えり','Eri Kitamura','voice_actor','anixia_curated','anixia:voice-actor:eri-kitamura'),
 ('Ryohei Kimura','木村良平','きむら りょうへい','Ryohei Kimura','voice_actor','anixia_curated','anixia:voice-actor:ryohei-kimura')
on conflict (source,source_id) do nothing;

insert into public.characters(name,name_ja,name_kana,name_en,source,source_id)
select v.name,v.name_ja,v.name_kana,v.name_en,'anixia_curated',v.character_key
from (values
 ('Jinta Yadomi','宿海仁太','やどみ じんた','Jinta Yadomi','anixia:anohana:jinta'),
 ('Meiko Honma','本間芽衣子','ほんま めいこ','Meiko Honma','anixia:anohana:menma'),
 ('Naruko Anjo','安城鳴子','あんじょう なるこ','Naruko Anjo','anixia:anohana:anaru'),
 ('Atsumu Matsuyuki','松雪集','まつゆき あつむ','Atsumu Matsuyuki','anixia:anohana:yukiatsu'),
 ('Chiriko Tsurumi','鶴見知利子','つるみ ちりこ','Chiriko Tsurumi','anixia:anohana:tsuruko'),
 ('Tetsudo Hisakawa','久川鉄道','ひさかわ てつどう','Tetsudo Hisakawa','anixia:anohana:poppo'),
 ('Yuzuru Otonashi','音無結弦','おとなし ゆづる','Yuzuru Otonashi','anixia:angel-beats:otonashi'),
 ('Yuri Nakamura','仲村ゆり','なかむら ゆり','Yuri Nakamura','anixia:angel-beats:yuri'),
 ('Kanade Tachibana','立華かなで','たちばな かなで','Kanade Tachibana','anixia:angel-beats:kanade'),
 ('Yui','ユイ','ゆい','Yui','anixia:angel-beats:yui'),
 ('Hideki Hinata','日向秀樹','ひなた ひでき','Hideki Hinata','anixia:angel-beats:hinata')
) v(name,name_ja,name_kana,name_en,character_key)
where not exists (
 select 1 from public.characters c
 where c.source='anixia_curated' and c.source_id=v.character_key
);

insert into public.anime_characters(anime_id,character_id,role)
select a.id,c.id,'main'
from (values
 ('Q483943','anixia:anohana:jinta'),
 ('Q483943','anixia:anohana:menma'),
 ('Q483943','anixia:anohana:anaru'),
 ('Q483943','anixia:anohana:yukiatsu'),
 ('Q483943','anixia:anohana:tsuruko'),
 ('Q483943','anixia:anohana:poppo'),
 ('Q531552','anixia:angel-beats:otonashi'),
 ('Q531552','anixia:angel-beats:yuri'),
 ('Q531552','anixia:angel-beats:kanade'),
 ('Q531552','anixia:angel-beats:yui'),
 ('Q531552','anixia:angel-beats:hinata')
) v(anime_qid,character_key)
join public.anime a on a.source='wikidata' and a.source_id=v.anime_qid
join public.characters c on c.source='anixia_curated' and c.source_id=v.character_key
where not exists (
 select 1 from public.anime_characters ac
 where ac.anime_id=a.id and ac.character_id=c.id
);

insert into public.anime_staff(anime_id,person_id,role,character_id)
select a.id,p.id,'voice_actor',c.id
from (values
 ('Q483943','anixia:anohana:jinta','anixia:voice-actor:miyu-irino'),
 ('Q483943','anixia:anohana:menma','anixia:voice-actor:ai-kayano'),
 ('Q483943','anixia:anohana:anaru','anixia:voice-actor:haruka-tomatsu'),
 ('Q483943','anixia:anohana:yukiatsu','anixia:voice-actor:takahiro-sakurai'),
 ('Q483943','anixia:anohana:tsuruko','anixia:voice-actor:saori-hayami'),
 ('Q483943','anixia:anohana:poppo','anixia:voice-actor:takayuki-kondo'),
 ('Q531552','anixia:angel-beats:otonashi','anixia:voice-actor:hiroshi-kamiya'),
 ('Q531552','anixia:angel-beats:yuri','anixia:voice-actor:hiromi-sakurai'),
 ('Q531552','anixia:angel-beats:kanade','anixia:voice-actor:kana-hanazawa'),
 ('Q531552','anixia:angel-beats:yui','anixia:voice-actor:eri-kitamura'),
 ('Q531552','anixia:angel-beats:hinata','anixia:voice-actor:ryohei-kimura')
) v(anime_qid,character_key,person_key)
join public.anime a on a.source='wikidata' and a.source_id=v.anime_qid
join public.characters c on c.source='anixia_curated' and c.source_id=v.character_key
join public.people p on p.source='anixia_curated' and p.source_id=v.person_key
where not exists (
 select 1 from public.anime_staff s
 where s.anime_id=a.id and s.person_id=p.id and s.role='voice_actor' and s.character_id=c.id
);


-- Seventh curated batch (2026-11-17): five principal characters and voice actors for Puella Magi Madoka Magica.
-- Official TV anime character/cast pages: https://www.madoka-magica.com/tv/archives/character/ and /staff/
-- People and characters use ANIXIA internal keys; no unverified external QIDs are assigned.
insert into public.people(name,name_ja,name_kana,name_en,person_type,source,source_id)
values
 ('Aoi Yuki','悠木碧','ゆうき あおい','Aoi Yuki','voice_actor','anixia_curated','anixia:voice-actor:aoi-yuki'),
 ('Chiwa Saito','斎藤千和','さいとう ちわ','Chiwa Saito','voice_actor','anixia_curated','anixia:voice-actor:chiwa-saito'),
 ('Kaori Mizuhashi','水橋かおり','みずはし かおり','Kaori Mizuhashi','voice_actor','anixia_curated','anixia:voice-actor:kaori-mizuhashi'),
 ('Eri Kitamura','喜多村英梨','きたむら えり','Eri Kitamura','voice_actor','anixia_curated','anixia:voice-actor:eri-kitamura'),
 ('Ai Nonaka','野中藍','のなか あい','Ai Nonaka','voice_actor','anixia_curated','anixia:voice-actor:ai-nonaka')
on conflict (source,source_id) do nothing;

insert into public.characters(name,name_ja,name_kana,name_en,source,source_id)
select v.name,v.name_ja,v.name_kana,v.name_en,'anixia_curated',v.character_key
from (values
 ('Madoka Kaname','鹿目まどか','かなめ まどか','Madoka Kaname','anixia:madoka:madoka'),
 ('Homura Akemi','暁美ほむら','あけみ ほむら','Homura Akemi','anixia:madoka:homura'),
 ('Mami Tomoe','巴マミ','ともえ まみ','Mami Tomoe','anixia:madoka:mami'),
 ('Sayaka Miki','美樹さやか','みき さやか','Sayaka Miki','anixia:madoka:sayaka'),
 ('Kyoko Sakura','佐倉杏子','さくら きょうこ','Kyoko Sakura','anixia:madoka:kyoko')
) v(name,name_ja,name_kana,name_en,character_key)
where not exists (
 select 1 from public.characters c
 where c.source='anixia_curated' and c.source_id=v.character_key
);

insert into public.anime_characters(anime_id,character_id,role)
select a.id,c.id,'main'
from (values
 ('anixia:madoka:madoka'),
 ('anixia:madoka:homura'),
 ('anixia:madoka:mami'),
 ('anixia:madoka:sayaka'),
 ('anixia:madoka:kyoko')
) v(character_key)
join public.anime a on a.source='wikidata' and a.source_id='Q53353'
join public.characters c on c.source='anixia_curated' and c.source_id=v.character_key
where not exists (
 select 1 from public.anime_characters ac
 where ac.anime_id=a.id and ac.character_id=c.id
);

insert into public.anime_staff(anime_id,person_id,role,character_id)
select a.id,p.id,'voice_actor',c.id
from (values
 ('anixia:madoka:madoka','anixia:voice-actor:aoi-yuki'),
 ('anixia:madoka:homura','anixia:voice-actor:chiwa-saito'),
 ('anixia:madoka:mami','anixia:voice-actor:kaori-mizuhashi'),
 ('anixia:madoka:sayaka','anixia:voice-actor:eri-kitamura'),
 ('anixia:madoka:kyoko','anixia:voice-actor:ai-nonaka')
) v(character_key,person_key)
join public.anime a on a.source='wikidata' and a.source_id='Q53353'
join public.characters c on c.source='anixia_curated' and c.source_id=v.character_key
join public.people p on p.source='anixia_curated' and p.source_id=v.person_key
where not exists (
 select 1 from public.anime_staff s
 where s.anime_id=a.id and s.person_id=p.id and s.role='voice_actor' and s.character_id=c.id
);


-- Eighth curated batch (2026-11-17): Re:Zero first-season principal cast.
-- Wikidata anime entity Q65086934 lists the voice-actor/character-role statements.
-- Japanese display names are cross-checked against the official first-season staff/cast page.
insert into public.people(name,name_ja,name_kana,name_en,person_type,source,source_id)
values
 ('Rie Takahashi','高橋李依','たかはし りえ','Rie Takahashi','voice_actor','wikidata','Q11671682'),
 ('Inori Minase','水瀬いのり','みなせ いのり','Inori Minase','voice_actor','wikidata','Q11548933'),
 ('Rie Murakawa','村川梨衣','むらかわ りえ','Rie Murakawa','voice_actor','wikidata','Q2811985'),
 ('Yumi Uchiyama','内山夕実','うちやま ゆみ','Yumi Uchiyama','voice_actor','wikidata','Q322979'),
 ('Chinatsu Akasaki','赤﨑千夏','あかさき ちなつ','Chinatsu Akasaki','voice_actor','wikidata','Q5100189')
on conflict (source,source_id) do nothing;

insert into public.people_external_ids(person_id,source,external_id,source_url,last_verified_at)
select p.id,'wikidata',p.source_id,'https://www.wikidata.org/wiki/'||p.source_id,now()
from public.people p
where p.source='wikidata'
  and p.source_id in ('Q11671682','Q11548933','Q2811985','Q322979','Q5100189')
on conflict do nothing;

insert into public.characters(name,name_ja,name_kana,name_en,source,source_id)
select v.name,v.name_ja,v.name_kana,v.name_en,'anixia_curated',v.character_key
from (values
 ('Emilia','エミリア','えみりあ','Emilia','anixia:rezero:emilia'),
 ('Rem','レム','れむ','Rem','anixia:rezero:rem'),
 ('Ram','ラム','らむ','Ram','anixia:rezero:ram'),
 ('Puck','パック','ぱっく','Puck','anixia:rezero:puck'),
 ('Felt','フェルト','ふぇると','Felt','anixia:rezero:felt')
) v(name,name_ja,name_kana,name_en,character_key)
where not exists (
 select 1 from public.characters c
 where c.source='anixia_curated' and c.source_id=v.character_key
);

insert into public.anime_characters(anime_id,character_id,role)
select a.id,c.id,'main'
from (values
 ('anixia:rezero:emilia'),
 ('anixia:rezero:rem'),
 ('anixia:rezero:ram'),
 ('anixia:rezero:puck'),
 ('anixia:rezero:felt')
) v(character_key)
join public.anime a on a.source='wikidata' and a.source_id='Q65086934'
join public.characters c on c.source='anixia_curated' and c.source_id=v.character_key
where not exists (
 select 1 from public.anime_characters ac
 where ac.anime_id=a.id and ac.character_id=c.id
);

insert into public.anime_staff(anime_id,person_id,role,character_id)
select a.id,p.id,'voice_actor',c.id
from (values
 ('anixia:rezero:subaru','Q17158282'),
 ('anixia:rezero:emilia','Q11671682'),
 ('anixia:rezero:rem','Q11548933'),
 ('anixia:rezero:ram','Q2811985'),
 ('anixia:rezero:puck','Q322979'),
 ('anixia:rezero:felt','Q5100189')
) v(character_key,person_qid)
join public.anime a on a.source='wikidata' and a.source_id='Q65086934'
join public.characters c on c.source='anixia_curated' and c.source_id=v.character_key
join public.people p on p.source='wikidata' and p.source_id=v.person_qid
where not exists (
 select 1 from public.anime_staff s
 where s.anime_id=a.id and s.person_id=p.id and s.role='voice_actor' and s.character_id=c.id
);


-- Ninth curated batch (2026-11-17): STEINS;GATE principal characters, voice actors and screenwriter.
-- Work entity: Wikidata Q20590069. Japanese names and cast pairings are checked against KADOKAWA Animation's official lineup.
insert into public.people(name,name_ja,name_kana,name_en,person_type,source,source_id)
values
 ('Mamoru Miyano','宮野真守','みやの まもる','Mamoru Miyano','voice_actor','wikidata','Q519821'),
 ('Tomokazu Seki','関智一','せき ともかず','Tomokazu Seki','voice_actor','wikidata','Q284401'),
 ('Yukari Tamura','田村ゆかり','たむら ゆかり','Yukari Tamura','voice_actor','wikidata','Q1022023'),
 ('Yū Kobayashi','小林ゆう','こばやし ゆう','Yū Kobayashi','voice_actor','wikidata','Q1324072'),
 ('Jukki Hanada','花田十輝','はなだ じゅっき','Jukki Hanada','screenwriter','wikidata','Q1088019')
on conflict (source,source_id) do nothing;

insert into public.people_external_ids(person_id,source,external_id,source_url,last_verified_at)
select p.id,'wikidata',v.qid,'https://www.wikidata.org/wiki/'||v.qid,now()
from (values
 ('Q519821'),
 ('Q49524'),
 ('Q284401'),
 ('Q1022023'),
 ('Q1324072'),
 ('Q1042804'),
 ('Q1088019')
) v(qid)
join public.people p
  on (p.source='wikidata' and p.source_id=v.qid)
  or (v.qid='Q49524' and p.source='anixia_curated' and p.source_id='anixia:voice-actor:kana-hanazawa')
on conflict do nothing;

insert into public.characters(name,name_ja,name_kana,name_en,source,source_id)
select v.name,v.name_ja,v.name_kana,v.name_en,'anixia_curated',v.character_key
from (values
 ('Rintaro Okabe','岡部倫太郎','おかべ りんたろう','Rintaro Okabe','anixia:steins-gate:okabe'),
 ('Mayuri Shiina','椎名まゆり','しいな まゆり','Mayuri Shiina','anixia:steins-gate:mayuri'),
 ('Itaru Hashida','橋田至','はしだ いたる','Itaru Hashida','anixia:steins-gate:itaru'),
 ('Suzuha Amane','阿万音鈴羽','あまね すずは','Suzuha Amane','anixia:steins-gate:suzuha'),
 ('Luka Urushibara','漆原るか','うるしばら るか','Luka Urushibara','anixia:steins-gate:luka')
) v(name,name_ja,name_kana,name_en,character_key)
where not exists (
 select 1 from public.characters c
 where c.source='anixia_curated' and c.source_id=v.character_key
);

insert into public.anime_characters(anime_id,character_id,role)
select a.id,c.id,v.role
from (values
 ('anixia:steins-gate:okabe','main'),
 ('anixia:steins-gate:mayuri','main'),
 ('anixia:steins-gate:itaru','main'),
 ('anixia:steins-gate:suzuha','supporting'),
 ('anixia:steins-gate:luka','supporting')
) v(character_key,role)
join public.anime a on a.source='wikidata' and a.source_id='Q20590069'
join public.characters c on c.source='anixia_curated' and c.source_id=v.character_key
where not exists (
 select 1 from public.anime_characters ac
 where ac.anime_id=a.id and ac.character_id=c.id
);

insert into public.anime_staff(anime_id,person_id,role,character_id)
select a.id,p.id,'voice_actor',c.id
from (values
 ('anixia:steins-gate:okabe','Q519821'),
 ('anixia:steins-gate:kurisu','Q1042804'),
 ('anixia:steins-gate:mayuri','Q49524'),
 ('anixia:steins-gate:itaru','Q284401'),
 ('anixia:steins-gate:suzuha','Q1022023'),
 ('anixia:steins-gate:luka','Q1324072')
) v(character_key,person_qid)
join public.anime a on a.source='wikidata' and a.source_id='Q20590069'
join public.characters c on c.source='anixia_curated' and c.source_id=v.character_key
join public.people_external_ids x on x.source='wikidata' and x.external_id=v.person_qid
join public.people p on p.id=x.person_id
where not exists (
 select 1 from public.anime_staff s
 where s.anime_id=a.id and s.person_id=p.id and s.role='voice_actor' and s.character_id=c.id
);

insert into public.anime_staff(anime_id,person_id,role,character_id)
select a.id,p.id,'screenwriter',null
from public.anime a
join public.people p on p.source='wikidata' and p.source_id='Q1088019'
where a.source='wikidata' and a.source_id='Q20590069'
  and not exists (
    select 1 from public.anime_staff s
    where s.anime_id=a.id and s.person_id=p.id
      and s.role='screenwriter' and s.character_id is null
  );
