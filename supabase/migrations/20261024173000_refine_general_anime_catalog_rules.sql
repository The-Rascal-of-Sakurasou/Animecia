-- Reproduce the reviewed Animecia public catalog rules.
-- Source records are retained; clear non-anime extras, preschool-targeted titles,
-- and explicitly adult titles are excluded from the public catalog.
CREATE OR REPLACE VIEW public.animecia_public_anime WITH (security_invoker = true) AS
 SELECT id,
    title,
    genre,
    description,
    review,
    official_url,
    english_title,
    recommended,
    recommended_start_at,
    recommended_end_at,
    external_id,
    title_romaji,
    title_english,
    title_native,
    title_japanese,
    cover_image,
    banner_image,
    start_date,
    end_date,
    episodes,
    duration,
    status,
    format,
    season,
    season_year,
    source,
    average_score,
    popularity,
    favourites_count,
    site_url,
    updated_at,
    created_at,
    title_user_preferred,
    anime_verification_status,
    anime_verification_confidence,
    anime_verification_reasons,
    search_aliases,
    streaming_links,
    genres_synced_at,
    source_provider,
    source_id,
    original_source,
    original_title,
    original_authors,
    source_metadata,
    synopsis,
    synopsis_source,
    synopsis_updated_at,
    genre_classified_at,
    genre_classification_version,
    genre_classification_confidence,
    genre_classification_reasons,
    subgenre_classification_version,
    subgenres_classified_at,
    start_date_precision,
    season_source,
    data_source_updated_at,
    is_adult,
    is_kids,
    is_sensitive_visual,
    is_japanese,
    duplicate_status,
    duplicate_of_id,
    duplicate_group_key,
    duplicate_review_reason,
    is_preschool,
    original_country_code,
    original_country_status,
    catalog_policy_decision,
    catalog_policy_reasons,
    catalog_policy_version
   FROM anime a
  WHERE anime_verification_status = 'verified'::text AND COALESCE(catalog_policy_decision, 'include'::text) <> 'exclude'::text AND COALESCE(duplicate_status, 'unique'::text) = 'unique'::text AND (upper(COALESCE(original_country_code, ''::text)) = 'JP'::text OR original_country_code IS NULL AND COALESCE(original_country_status, 'unknown'::text) <> 'verified_non_jp'::text) AND start_date IS NOT NULL AND start_date >= '1963-01-01'::date AND (upper(COALESCE(format, ''::text)) = ANY (ARRAY['TV'::text, 'TV_SHORT'::text, 'MOVIE'::text, 'OVA'::text, 'OAV'::text, 'ONA'::text])) AND COALESCE(is_adult, false) = false AND COALESCE(is_preschool, false) = false AND NOT (concat_ws(' '::text, title, title_japanese, title_native, title_english, title_romaji, english_title, title_user_preferred) ~* '(^|[[:space:]【(（])PV([[:space:]】)）]|$)|(^|[[:space:]【(（])CM([[:space:]】)）]|$)|trailer|teaser|promotional[[:space:]-]+video|advertisement|commercial|予告編|予告映像|ティザー映像|ティーザー映像|宣伝映像|広告動画|特報'::text OR COALESCE(source_metadata ->> 'type'::text, ''::text) ~* 'trailer|teaser|promotional|advertisement|commercial|(^|[[:space:]])PV([[:space:]]|$)|(^|[[:space:]])CM([[:space:]]|$)'::text) AND NOT (concat_ws(' '::text, title, title_japanese, title_native, title_english, title_romaji, english_title, title_user_preferred) ~* 'trailer|teaser|promotional[[:space:]-]+video|music[[:space:]-]+video|(^|[[:space:]])(PV|CM|MV)([[:space:]]|$)|web[[:space:]-]+preview|yokoku|picture[[:space:]-]+drama|mini[[:space:]-]+drama|mini[[:space:]-]+theater|off[[:space:]-]+shot|behind[[:space:]-]+the[[:space:]-]+scenes|making[[:space:]-]+of|tutorial|educational|advertisement|commercial|PR[[:space:]-]+video|opening[[:space:]-]+ending[[:space:]-]+encyclopedia|battle[[:space:]-]+digest|LIVE[[:space:]-]+Revolution|予告|特報|番宣|広告|メイキング|講座|教材|観光PR|企業広告|商品紹介|キャラクター紹介|プロローグムービー|紹介SPムービー|クリエイターにチャレンジ|オフショット|しつけハウツー|しあわせってなあに|よいこのたのしいクリスマス|ゴジランド|けろけろけろっぴ|アンパンマン|しまじろう|シルバニアファミリー|ウルトラマン.?キッズ|ゴールデン.?キッズ|はたらキッズ|おかあさんといっしょ|いないいないばあ|みいつけた|えいごであそぼ|ねずみくんのチョッキ|ぷにるんず|ゲルぴよ|成人向け|18禁|R18|アダルトアニメ|ポルノ|エロアニメ|挿れてもいい|ハメられました|淫らな肉食'::text OR COALESCE(source_metadata ->> 'type'::text, ''::text) ~* 'trailer|teaser|promotional|advertisement|commercial|(^|[[:space:]])(PV|CM|MV)([[:space:]]|$)'::text) AND NOT concat_ws(' '::text, title, title_japanese, title_native, title_english, title_romaji, english_title, title_user_preferred) ~* 'picture[[:space:]-]+drama|ピクチャードラマ|ミニアニメ劇場|ミニアニメ.*講座|ミニアニメ|特典映像|オープニング[[:space:]]*エンディング.*大百科|BATTLE[[:space:]-]+(STAGE|DIGEST)|ASIENCE|Rainbow[[:space:]]+signal|Zektbach|めざめの方舟|合体ロボット[[:space:]]*アトランジャー|LIVE[[:space:]-]+Revolution'::text;;

CREATE OR REPLACE FUNCTION public.search_anime_catalog_v2(p_query text DEFAULT NULL::text, p_year integer DEFAULT NULL::integer, p_season text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_format text DEFAULT NULL::text, p_genre_id bigint DEFAULT NULL::bigint, p_studio_id bigint DEFAULT NULL::bigint, p_sort text DEFAULT 'title'::text, p_limit integer DEFAULT 24, p_offset integer DEFAULT 0)
 RETURNS TABLE(id bigint, title text, title_japanese text, title_native text, title_user_preferred text, title_romaji text, title_english text, english_title text, cover_image text, banner_image text, format text, genre text, description text, review text, synopsis text, official_url text, site_url text, streaming_links jsonb, start_date date, end_date date, episodes integer, duration integer, season text, season_year integer, status text, source text, average_score numeric, popularity integer, favourites_count integer, search_rank real, total_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
 SET statement_timeout TO '8s'
AS $function$
WITH base AS (
  SELECT
    a.id, a.title, a.title_japanese, a.title_native, a.title_user_preferred,
    a.title_romaji, a.title_english, a.english_title, a.cover_image,
    a.banner_image, a.format, a.genre, a.description, a.review, a.synopsis,
    a.official_url, a.site_url, a.streaming_links, a.start_date, a.end_date,
    a.episodes, a.duration, a.season, a.season_year, a.status, a.source,
    COALESCE(e.average_rating, a.average_score)::numeric AS average_score,
    a.popularity,
    COALESCE(e.favorite_count, a.favourites_count, 0)::integer AS favourites_count,
    CASE
      WHEN NULLIF(btrim(p_query), '') IS NULL THEN 0::real
      WHEN lower(btrim(COALESCE(a.title_japanese, ''))) = lower(btrim(p_query))
        OR lower(btrim(COALESCE(a.title_native, ''))) = lower(btrim(p_query))
        OR lower(btrim(COALESCE(a.title, ''))) = lower(btrim(p_query))
        OR lower(btrim(COALESCE(a.title_romaji, ''))) = lower(btrim(p_query))
        OR lower(btrim(COALESCE(a.title_english, ''))) = lower(btrim(p_query))
        OR lower(btrim(COALESCE(a.english_title, ''))) = lower(btrim(p_query))
        OR EXISTS (SELECT 1 FROM unnest(COALESCE(a.search_aliases, ARRAY[]::text[])) alias WHERE lower(btrim(alias)) = lower(btrim(p_query)))
        THEN 100::real
      WHEN lower(COALESCE(a.title_japanese, '')) LIKE lower(btrim(p_query)) || '%'
        OR lower(COALESCE(a.title_native, '')) LIKE lower(btrim(p_query)) || '%'
        OR lower(COALESCE(a.title, '')) LIKE lower(btrim(p_query)) || '%'
        OR lower(COALESCE(a.title_romaji, '')) LIKE lower(btrim(p_query)) || '%'
        OR lower(COALESCE(a.title_english, '')) LIKE lower(btrim(p_query)) || '%'
        OR lower(COALESCE(a.english_title, '')) LIKE lower(btrim(p_query)) || '%'
        THEN 80::real
      ELSE 0::real
    END AS search_rank,
    count(*) OVER() AS total_count,
    COALESCE(
      NULLIF(btrim(r.reading), ''),
      public.anime_title_sort_key(a.title_romaji, a.title_japanese, a.title_native, a.title),
      CASE
        WHEN src.title_kana ~ '[ぁ-んァ-ヶ]'
         AND src.title_kana !~ '[A-Za-z一-龥々]'
        THEN translate(src.title_kana,
          'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒホマミムメモヤユヨラリルレロワヲンガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポ',
          'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ')
        ELSE NULL
      END
    ) AS title_sort_key
  FROM public.animecia_public_anime a
  LEFT JOIN public.anime src ON src.id = a.id
  LEFT JOIN public.anime_engagement_summary e ON e.anime_id = a.id
  LEFT JOIN public.anime_title_reading_overrides r ON r.anime_id = a.id
  WHERE
    (
      nullif(btrim(p_query), '') IS NULL
      OR lower(COALESCE(a.title_japanese, '')) LIKE '%' || lower(btrim(p_query)) || '%'
      OR lower(COALESCE(a.title_native, '')) LIKE '%' || lower(btrim(p_query)) || '%'
      OR lower(COALESCE(a.title, '')) LIKE '%' || lower(btrim(p_query)) || '%'
      OR lower(COALESCE(a.title_romaji, '')) LIKE '%' || lower(btrim(p_query)) || '%'
      OR lower(COALESCE(a.title_english, '')) LIKE '%' || lower(btrim(p_query)) || '%'
      OR lower(COALESCE(a.english_title, '')) LIKE '%' || lower(btrim(p_query)) || '%'
      OR EXISTS (
        SELECT 1 FROM unnest(COALESCE(a.search_aliases, ARRAY[]::text[])) alias
        WHERE lower(alias) LIKE '%' || lower(btrim(p_query)) || '%'
      )
    )
    AND (p_year IS NULL OR a.season_year = p_year)
    AND (p_season IS NULL OR lower(a.season) = lower(p_season))
    AND (p_status IS NULL OR a.status = p_status)
    AND (p_format IS NULL OR a.format = p_format)
    AND (p_genre_id IS NULL OR EXISTS (
      SELECT 1 FROM public.anime_genres ag
      WHERE ag.anime_id = a.id AND ag.genre_id = p_genre_id
    ))
    AND (p_studio_id IS NULL OR EXISTS (
      SELECT 1 FROM public.anime_studios ast
      WHERE ast.anime_id = a.id AND ast.studio_id = p_studio_id
    ))
),
syllables AS (
  SELECT base.*,
    CASE
      WHEN title_sort_key ~ '^a' OR title_sort_key ~ '^あ' THEN 'a'
      WHEN title_sort_key ~ '^i' OR title_sort_key ~ '^い' THEN 'i'
      WHEN title_sort_key ~ '^u' OR title_sort_key ~ '^う' THEN 'u'
      WHEN title_sort_key ~ '^e' OR title_sort_key ~ '^え' THEN 'e'
      WHEN title_sort_key ~ '^o' OR title_sort_key ~ '^お' THEN 'o'
      WHEN title_sort_key ~ '^kya|^gya' OR title_sort_key ~ '^きゃ|^ぎゃ' THEN 'kya'
      WHEN title_sort_key ~ '^kyu|^gyu' OR title_sort_key ~ '^きゅ|^ぎゅ' THEN 'kyu'
      WHEN title_sort_key ~ '^kyo|^gyo' OR title_sort_key ~ '^きょ|^ぎょ' THEN 'kyo'
      WHEN title_sort_key ~ '^sha|^shu|^sho|^ja|^ju|^jo|^jya|^jyu|^jyo' OR title_sort_key ~ '^しゃ|^しゅ|^しょ|^じゃ|^じゅ|^じょ' THEN 'shi'
      WHEN title_sort_key ~ '^cha|^chu|^cho|^tya|^tyu|^tyo' OR title_sort_key ~ '^ちゃ|^ちゅ|^ちょ' THEN 'chi'
      WHEN title_sort_key ~ '^nya' OR title_sort_key ~ '^にゃ' THEN 'nya'
      WHEN title_sort_key ~ '^nyu' OR title_sort_key ~ '^にゅ' THEN 'nyu'
      WHEN title_sort_key ~ '^nyo' OR title_sort_key ~ '^にょ' THEN 'nyo'
      WHEN title_sort_key ~ '^ka|^ga' OR title_sort_key ~ '^か|^が' THEN 'ka'
      WHEN title_sort_key ~ '^ki|^gi' OR title_sort_key ~ '^き|^ぎ' THEN 'ki'
      WHEN title_sort_key ~ '^ku|^gu' OR title_sort_key ~ '^く|^ぐ' THEN 'ku'
      WHEN title_sort_key ~ '^ke|^ge' OR title_sort_key ~ '^け|^げ' THEN 'ke'
      WHEN title_sort_key ~ '^ko|^go' OR title_sort_key ~ '^こ|^ご' THEN 'ko'
      WHEN title_sort_key ~ '^sa|^za' OR title_sort_key ~ '^さ|^ざ' THEN 'sa'
      WHEN title_sort_key ~ '^shi|^ji' OR title_sort_key ~ '^し|^じ' THEN 'shi'
      WHEN title_sort_key ~ '^su|^zu' OR title_sort_key ~ '^す|^ず' THEN 'su'
      WHEN title_sort_key ~ '^se|^ze' OR title_sort_key ~ '^せ|^ぜ' THEN 'se'
      WHEN title_sort_key ~ '^so|^zo' OR title_sort_key ~ '^そ|^ぞ' THEN 'so'
      WHEN title_sort_key ~ '^ta|^da' OR title_sort_key ~ '^た|^だ' THEN 'ta'
      WHEN title_sort_key ~ '^chi|^di' OR title_sort_key ~ '^ち|^ぢ' THEN 'chi'
      WHEN title_sort_key ~ '^tsu|^du' OR title_sort_key ~ '^つ|^づ' THEN 'tsu'
      WHEN title_sort_key ~ '^te|^de' OR title_sort_key ~ '^て|^で' THEN 'te'
      WHEN title_sort_key ~ '^to|^do' OR title_sort_key ~ '^と|^ど' THEN 'to'
      WHEN title_sort_key ~ '^na' OR title_sort_key ~ '^な' THEN 'na'
      WHEN title_sort_key ~ '^ni' OR title_sort_key ~ '^に' THEN 'ni'
      WHEN title_sort_key ~ '^nu' OR title_sort_key ~ '^ぬ' THEN 'nu'
      WHEN title_sort_key ~ '^ne' OR title_sort_key ~ '^ね' THEN 'ne'
      WHEN title_sort_key ~ '^no' OR title_sort_key ~ '^の' THEN 'no'
      WHEN title_sort_key ~ '^hya|^bya|^pya' OR title_sort_key ~ '^ひゃ|^びゃ|^ぴゃ' THEN 'hya'
      WHEN title_sort_key ~ '^hyu|^byu|^pyu' OR title_sort_key ~ '^ひゅ|^びゅ|^ぴゅ' THEN 'hyu'
      WHEN title_sort_key ~ '^hyo|^byo|^pyo' OR title_sort_key ~ '^ひょ|^びょ|^ぴょ' THEN 'hyo'
      WHEN title_sort_key ~ '^ha|^ba|^pa' OR title_sort_key ~ '^は|^ば|^ぱ' THEN 'ha'
      WHEN title_sort_key ~ '^hi|^bi|^pi' OR title_sort_key ~ '^ひ|^び|^ぴ' THEN 'hi'
      WHEN title_sort_key ~ '^fu|^bu|^pu' OR title_sort_key ~ '^ふ|^ぶ|^ぷ' THEN 'fu'
      WHEN title_sort_key ~ '^he|^be|^pe' OR title_sort_key ~ '^へ|^べ|^ぺ' THEN 'he'
      WHEN title_sort_key ~ '^ho|^bo|^po' OR title_sort_key ~ '^ほ|^ぼ|^ぽ' THEN 'ho'
      WHEN title_sort_key ~ '^ma' OR title_sort_key ~ '^ま' THEN 'ma'
      WHEN title_sort_key ~ '^mi' OR title_sort_key ~ '^み' THEN 'mi'
      WHEN title_sort_key ~ '^mu' OR title_sort_key ~ '^む' THEN 'mu'
      WHEN title_sort_key ~ '^me' OR title_sort_key ~ '^め' THEN 'me'
      WHEN title_sort_key ~ '^mo' OR title_sort_key ~ '^も' THEN 'mo'
      WHEN title_sort_key ~ '^ya' OR title_sort_key ~ '^や' THEN 'ya'
      WHEN title_sort_key ~ '^yu' OR title_sort_key ~ '^ゆ' THEN 'yu'
      WHEN title_sort_key ~ '^yo' OR title_sort_key ~ '^よ' THEN 'yo'
      WHEN title_sort_key ~ '^rya' OR title_sort_key ~ '^りゃ' THEN 'rya'
      WHEN title_sort_key ~ '^ryu' OR title_sort_key ~ '^りゅ' THEN 'ryu'
      WHEN title_sort_key ~ '^ryo' OR title_sort_key ~ '^りょ' THEN 'ryo'
      WHEN title_sort_key ~ '^ra' OR title_sort_key ~ '^ら' THEN 'ra'
      WHEN title_sort_key ~ '^ri' OR title_sort_key ~ '^り' THEN 'ri'
      WHEN title_sort_key ~ '^ru' OR title_sort_key ~ '^る' THEN 'ru'
      WHEN title_sort_key ~ '^re' OR title_sort_key ~ '^れ' THEN 're'
      WHEN title_sort_key ~ '^ro' OR title_sort_key ~ '^ろ' THEN 'ro'
      WHEN title_sort_key ~ '^wa' OR title_sort_key ~ '^わ' THEN 'wa'
      WHEN title_sort_key ~ '^wo' OR title_sort_key ~ '^を' THEN 'wo'
      WHEN title_sort_key ~ '^n' OR title_sort_key ~ '^ん' THEN 'n'
      ELSE ''
    END AS syllable
  FROM base
),
ranked AS (
  SELECT syllables.*,
    CASE syllable
      WHEN 'a' THEN 1 WHEN 'i' THEN 2 WHEN 'u' THEN 3 WHEN 'e' THEN 4 WHEN 'o' THEN 5
      WHEN 'ka' THEN 6 WHEN 'ki' THEN 7 WHEN 'kya' THEN 7 WHEN 'kyu' THEN 7 WHEN 'kyo' THEN 7 WHEN 'ku' THEN 8 WHEN 'ke' THEN 9 WHEN 'ko' THEN 10
      WHEN 'sa' THEN 11 WHEN 'shi' THEN 12 WHEN 'su' THEN 13 WHEN 'se' THEN 14 WHEN 'so' THEN 15
      WHEN 'ta' THEN 16 WHEN 'chi' THEN 17 WHEN 'tsu' THEN 18 WHEN 'te' THEN 19 WHEN 'to' THEN 20
      WHEN 'na' THEN 21 WHEN 'ni' THEN 22 WHEN 'nya' THEN 22 WHEN 'nyu' THEN 22 WHEN 'nyo' THEN 22 WHEN 'nu' THEN 23 WHEN 'ne' THEN 24 WHEN 'no' THEN 25
      WHEN 'ha' THEN 26 WHEN 'hi' THEN 27 WHEN 'hya' THEN 27 WHEN 'hyu' THEN 27 WHEN 'hyo' THEN 27 WHEN 'fu' THEN 28 WHEN 'he' THEN 29 WHEN 'ho' THEN 30
      WHEN 'ma' THEN 31 WHEN 'mi' THEN 32 WHEN 'mya' THEN 32 WHEN 'mu' THEN 33 WHEN 'me' THEN 34 WHEN 'mo' THEN 35
      WHEN 'ya' THEN 36 WHEN 'yu' THEN 37 WHEN 'yo' THEN 38
      WHEN 'ra' THEN 39 WHEN 'ri' THEN 40 WHEN 'rya' THEN 40 WHEN 'ryu' THEN 40 WHEN 'ryo' THEN 40 WHEN 'ru' THEN 41 WHEN 're' THEN 42 WHEN 'ro' THEN 43
      WHEN 'wa' THEN 44 WHEN 'wo' THEN 45 WHEN 'n' THEN 46 ELSE 99
    END AS kana_order,
    CASE
      WHEN title_sort_key ~ '^[ぁ-ん]' THEN substr(title_sort_key, 2)
      WHEN title_sort_key ~ '^[ァ-ヶ]' THEN substr(title_sort_key, 2)
      WHEN syllable <> '' THEN substr(title_sort_key, length(syllable) + 1)
      ELSE title_sort_key
    END AS sort_tail
  FROM syllables
),
page AS (
  SELECT ranked.*,
    row_number() OVER (
      ORDER BY
        CASE WHEN NULLIF(btrim(p_query), '') IS NOT NULL THEN search_rank END DESC NULLS LAST,
        CASE WHEN p_sort IN ('score','rating') THEN average_score END DESC NULLS LAST,
        CASE WHEN p_sort = 'popularity' THEN favourites_count END DESC NULLS LAST,
        CASE WHEN p_sort IN ('newest','new') THEN start_date END DESC NULLS LAST,
        CASE WHEN p_sort = 'oldest' THEN start_date END ASC NULLS LAST,
        CASE WHEN p_sort = 'title' THEN kana_order END ASC,
        CASE WHEN p_sort = 'title' THEN sort_tail COLLATE "ja-x-icu" END ASC NULLS LAST,
        CASE WHEN p_sort = 'title' THEN title_sort_key COLLATE "ja-x-icu" END ASC NULLS LAST,
        id ASC
    ) AS page_order
  FROM ranked
  ORDER BY
    CASE WHEN NULLIF(btrim(p_query), '') IS NOT NULL THEN search_rank END DESC NULLS LAST,
    CASE WHEN p_sort IN ('score','rating') THEN average_score END DESC NULLS LAST,
    CASE WHEN p_sort = 'popularity' THEN favourites_count END DESC NULLS LAST,
    CASE WHEN p_sort IN ('newest','new') THEN start_date END DESC NULLS LAST,
    CASE WHEN p_sort = 'oldest' THEN start_date END ASC NULLS LAST,
    CASE WHEN p_sort = 'title' THEN kana_order END ASC,
    CASE WHEN p_sort = 'title' THEN sort_tail COLLATE "ja-x-icu" END ASC NULLS LAST,
    CASE WHEN p_sort = 'title' THEN title_sort_key COLLATE "ja-x-icu" END ASC NULLS LAST,
    id ASC
  LIMIT greatest(1, least(COALESCE(p_limit, 24), 1000))
  OFFSET greatest(COALESCE(p_offset, 0), 0)
)
SELECT
  a.id, a.title, a.title_japanese, a.title_native, a.title_user_preferred,
  a.title_romaji, a.title_english, a.english_title, a.cover_image,
  a.banner_image, a.format, a.genre, a.description, a.review, a.synopsis,
  a.official_url, a.site_url, a.streaming_links, a.start_date, a.end_date,
  a.episodes, a.duration, a.season, a.season_year, a.status, a.source,
  page.average_score, page.popularity, page.favourites_count,
  page.search_rank, page.total_count
FROM page
JOIN public.animecia_public_anime a ON a.id = page.id
ORDER BY page.page_order;
$function$
;

-- Idempotently record exclusions for verified rows that are clearly outside the user's catalog rules.
WITH candidates AS (
  SELECT id,
    CASE
      WHEN COALESCE(is_adult,false) OR concat_ws(' ',title,title_japanese,title_native,title_romaji,title_english,english_title) ~* '(成人向け|18禁|R18|アダルトアニメ|ポルノ|エロアニメ|挿れてもいい|ハメられました|淫らな肉食)'
        THEN 'excluded_adult_or_explicit_sexual_content'
      WHEN COALESCE(is_preschool,false) OR concat_ws(' ',title,title_japanese,title_native,title_romaji,title_english,english_title) ~* '(しつけハウツー|しあわせってなあに|よいこのたのしいクリスマス|ゴジランド|けろけろけろっぴ|アンパンマン|しまじろう|シルバニアファミリー|ウルトラマン.?キッズ|ゴールデン.?キッズ|はたらキッズ|おかあさんといっしょ|いないいないばあ|みいつけた|えいごであそぼ|ねずみくんのチョッキ|ぷにるんず|ゲルぴよ)'
        THEN 'excluded_preschool_or_early_childhood_content'
      ELSE 'excluded_promotional_educational_or_non_standalone_video'
    END AS reason
  FROM public.anime
  WHERE anime_verification_status='verified'
    AND (
      COALESCE(is_adult,false) OR COALESCE(is_preschool,false)
      OR concat_ws(' ',title,title_japanese,title_native,title_romaji,title_english,english_title,title_user_preferred) ~* '(trailer|teaser|promotional[[:space:]-]+video|music[[:space:]-]+video|(^|[[:space:]])(PV|CM|MV)([[:space:]]|$)|web[[:space:]-]+preview|yokoku|picture[[:space:]-]+drama|ピクチャードラマ|ミニアニメ劇場|ミニアニメ.*講座|ミニアニメ|特典映像|off[[:space:]-]+shot|behind[[:space:]-]+the[[:space:]-]+scenes|making[[:space:]-]+of|tutorial|educational|advertisement|commercial|PR[[:space:]-]+video|opening[[:space:]-]+ending[[:space:]-]+encyclopedia|battle[[:space:]-]+(stage|digest)|ASIENCE|Rainbow[[:space:]]+signal|Zektbach|めざめの方舟|合体ロボット[[:space:]]*アトランジャー|LIVE[[:space:]-]+Revolution|予告|特報|番宣|広告|メイキング|講座|教材|観光PR|企業広告|商品紹介|キャラクター紹介|プロローグムービー|紹介SPムービー|クリエイターにチャレンジ|オフショット|しつけハウツー|しあわせってなあに|よいこのたのしいクリスマス|ゴジランド|けろけろけろっぴ|アンパンマン|しまじろう|シルバニアファミリー|ウルトラマン.?キッズ|ゴールデン.?キッズ|はたらキッズ|おかあさんといっしょ|いないいないばあ|みいつけた|えいごであそぼ|ねずみくんのチョッキ|ぷにるんず|ゲルぴよ|成人向け|18禁|R18|アダルトアニメ|ポルノ|エロアニメ|挿れてもいい|ハメられました|淫らな肉食)'
    )
)
UPDATE public.anime a
SET catalog_policy_decision='exclude',
    catalog_policy_reasons=CASE WHEN c.reason=ANY(COALESCE(a.catalog_policy_reasons,ARRAY[]::text[]))
      THEN COALESCE(a.catalog_policy_reasons,ARRAY[]::text[])
      ELSE array_append(COALESCE(a.catalog_policy_reasons,ARRAY[]::text[]),c.reason)
    END
FROM candidates c
WHERE a.id=c.id AND (
  a.catalog_policy_decision IS DISTINCT FROM 'exclude'
  OR NOT (c.reason=ANY(COALESCE(a.catalog_policy_reasons,ARRAY[]::text[])))
);

-- Correct an identified format mismatch: official schedule lists 30-minute TV episodes.
UPDATE public.anime
SET format='TV', duration=30,
    catalog_policy_reasons=CASE
      WHEN 'format_corrected_from_official_30_minute_tv_schedule'=ANY(COALESCE(catalog_policy_reasons,ARRAY[]::text[]))
      THEN COALESCE(catalog_policy_reasons,ARRAY[]::text[])
      ELSE array_append(COALESCE(catalog_policy_reasons,ARRAY[]::text[]),'format_corrected_from_official_30_minute_tv_schedule')
    END
WHERE id=13234 AND title='ダークサモナーとデキている' AND upper(format)='TV_SHORT';
