-- Review 17 Wikidata candidates. Publish only the 15 records that meet
-- ANIXIA's catalogue scope and have sufficiently verified identity/metadata.
-- Keep two uncertain/out-of-scope records unpublished.

with reviewed(source_id, title, title_ja, title_kana, official_url, episode_count) as (
  values
  ('Q100272455','Strawberry Panic!','ストロベリー・パニック','すとろべりー・ぱにっく','https://www.lantis.jp/title/8c6bc71ee4fd1737396de1281c165c39/',26),
  ('Q100144393','Orenchi no Furo Jijou','オレん家のフロ事情','おれんちのふろじじょう','https://www.at-x.com/program/detail/?id=17160',13),
  ('Q100271392','Karakuri Circus','からくりサーカス','からくりサーカス',null,36),
  ('Q100272128','Magical Girl Site','魔法少女サイト','まほうしょうじょさいと','https://mahoushoujyo-anime.com/',12),
  ('Q100272968','Smile Down the Runway','ランウェイで笑って','らんうぇいでわらって','https://runway-anime.com/',12),
  ('Q100271376','High School Fleet the Movie','劇場版 ハイスクール・フリート','げきじょうばん はいすくーる・ふりーと','https://www.aniplex.co.jp/lineup/hai-fri-movie/',null),
  ('Q100156151','Made in Abyss: Dawn of the Deep Soul','劇場版メイドインアビス 深き魂の黎明','げきじょうばん めいどいんあびす ふかきたましいのれいめい','https://license.kadokawa.co.jp/anime/2020winter/entry-667.html',null),
  ('Q100256360','2.43: Seiin High School Boys Volleyball Team','2.43 清陰高校男子バレー部','にーてんよんさん せいいんこうこうだんしばれーぶ','https://243anime.com/',12),
  ('Q100254928','SK8 the Infinity','SK∞ エスケーエイト','えすけーえいと','https://sk8-project.com/',12),
  ('Q100050258','SSSS.DYNAZENON','SSSS.DYNAZENON','だいなぜのん','https://s.mxtv.jp/anime/dynazenon/episode.html',12),
  ('Q100255605','Idolls!','アイドールズ!','あいどーるず','https://shin-ei-animation.jp/works/idols/',10),
  ('Q100235430','Wonder Egg Priority','ワンダーエッグ・プライオリティ','わんだーえっぐ・ぷらいおりてぃ','https://wonder-egg-priority.com/',12),
  ('Q100148203','Koikimo','恋と呼ぶには気持ち悪い','こいとよぶにはきもちわるい','https://www.koikimo.jp/',12),
  ('Q100255568','Tokyo Revengers','東京リベンジャーズ','とうきょうりべんじゃーず','https://tokyo-revengers-anime.com/',null),
  ('Q100317090','Kiyo in Kyoto','舞妓さんちのまかないさん','まいこさんちのまかないさん','https://www.nhk.jp/p/maikosan/ts/W62WGG1V57/',36)
),
updated as (
  update public.anime a
  set title=v.title,
      title_ja=v.title_ja,
      title_kana=v.title_kana,
      official_url=coalesce(v.official_url,a.official_url),
      official_site_url=coalesce(v.official_url,a.official_site_url),
      episode_count=coalesce(v.episode_count,a.episode_count),
      episodes_count=coalesce(v.episode_count,a.episodes_count),
      is_published=true,
      source_synced_at=now(),
      updated_at=now()
  from reviewed v
  where a.source='wikidata' and a.source_id=v.source_id
  returning a.id,a.source_id
)
insert into public.anime_external_ids(anime_id,source,external_id,source_url,is_primary,last_verified_at)
select id,'wikidata',source_id,'https://www.wikidata.org/wiki/'||source_id,true,now()
from updated
on conflict (anime_id,source) do update set
  external_id=excluded.external_id,
  source_url=excluded.source_url,
  is_primary=true,
  last_verified_at=now();
