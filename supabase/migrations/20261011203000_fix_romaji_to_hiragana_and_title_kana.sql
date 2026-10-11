-- Fix missing single-vowel conversion in the romaji-to-hiragana routine.
-- Normalize full-width ASCII before title normalization so it does not collapse to empty.
CREATE OR REPLACE FUNCTION public.romaji_to_hiragana(p_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO public, extensions, pg_temp
AS $function$
DECLARE
  s text := lower(coalesce(p_text, ''));
  out text := '';
  i int := 1;
  n int := length(s);
  ch text;
  c2 text;
  c3 text;
  val text;
BEGIN
  WHILE i <= n LOOP
    ch := substr(s, i, 1);
    c2 := substr(s, i, 2);
    c3 := substr(s, i, 3);

    IF ch !~ '[a-z]' THEN
      out := out || ch;
      i := i + 1;
      CONTINUE;
    END IF;

    IF ch = 'n' AND NOT (i < n AND substr(s, i + 1, 1) IN ('a','i','u','e','o','y')) THEN
      out := out || 'ん';
      i := i + 1;
      CONTINUE;
    END IF;

    IF i < n AND ch = substr(s, i + 1, 1)
       AND ch IN ('b','c','d','f','g','h','j','k','l','m','p','q','r','s','t','v','w','x','y','z') THEN
      out := out || 'っ';
      i := i + 1;
      CONTINUE;
    END IF;

    val := CASE c3
      WHEN 'kya' THEN 'きゃ' WHEN 'kyu' THEN 'きゅ' WHEN 'kyo' THEN 'きょ'
      WHEN 'gya' THEN 'ぎゃ' WHEN 'gyu' THEN 'ぎゅ' WHEN 'gyo' THEN 'ぎょ'
      WHEN 'sha' THEN 'しゃ' WHEN 'shu' THEN 'しゅ' WHEN 'sho' THEN 'しょ'
      WHEN 'cha' THEN 'ちゃ' WHEN 'chu' THEN 'ちゅ' WHEN 'cho' THEN 'ちょ'
      WHEN 'nya' THEN 'にゃ' WHEN 'nyu' THEN 'にゅ' WHEN 'nyo' THEN 'にょ'
      WHEN 'hya' THEN 'ひゃ' WHEN 'hyu' THEN 'ひゅ' WHEN 'hyo' THEN 'ひょ'
      WHEN 'bya' THEN 'びゃ' WHEN 'byu' THEN 'びゅ' WHEN 'byo' THEN 'びょ'
      WHEN 'pya' THEN 'ぴゃ' WHEN 'pyu' THEN 'ぴゅ' WHEN 'pyo' THEN 'ぴょ'
      WHEN 'mya' THEN 'みゃ' WHEN 'myu' THEN 'みゅ' WHEN 'myo' THEN 'みょ'
      WHEN 'rya' THEN 'りゃ' WHEN 'ryu' THEN 'りゅ' WHEN 'ryo' THEN 'りょ'
      WHEN 'jya' THEN 'じゃ' WHEN 'jyu' THEN 'じゅ' WHEN 'jyo' THEN 'じょ'
      WHEN 'shi' THEN 'し' WHEN 'chi' THEN 'ち' WHEN 'tsu' THEN 'つ'
      WHEN 'dzu' THEN 'づ' WHEN 'dji' THEN 'ぢ' WHEN 'tch' THEN 'っち'
      WHEN 'cch' THEN 'っち' WHEN 'wha' THEN 'うぁ' WHEN 'whi' THEN 'うぃ'
      WHEN 'whe' THEN 'うぇ' WHEN 'who' THEN 'うぉ'
      WHEN 'fya' THEN 'ふゃ' WHEN 'fyu' THEN 'ふゅ' WHEN 'fyo' THEN 'ふょ'
      WHEN 'vya' THEN 'ゔゃ' WHEN 'vyu' THEN 'ゔゅ' WHEN 'vyo' THEN 'ゔょ'
      ELSE NULL
    END;

    IF val IS NOT NULL THEN
      out := out || val;
      i := i + 3;
      CONTINUE;
    END IF;

    val := CASE c2
      WHEN 'ka' THEN 'か' WHEN 'ki' THEN 'き' WHEN 'ku' THEN 'く' WHEN 'ke' THEN 'け' WHEN 'ko' THEN 'こ'
      WHEN 'ga' THEN 'が' WHEN 'gi' THEN 'ぎ' WHEN 'gu' THEN 'ぐ' WHEN 'ge' THEN 'げ' WHEN 'go' THEN 'ご'
      WHEN 'sa' THEN 'さ' WHEN 'si' THEN 'し' WHEN 'su' THEN 'す' WHEN 'se' THEN 'せ' WHEN 'so' THEN 'そ'
      WHEN 'za' THEN 'ざ' WHEN 'zi' THEN 'じ' WHEN 'zu' THEN 'ず' WHEN 'ze' THEN 'ぜ' WHEN 'zo' THEN 'ぞ'
      WHEN 'ta' THEN 'た' WHEN 'ti' THEN 'ち' WHEN 'tu' THEN 'つ' WHEN 'te' THEN 'て' WHEN 'to' THEN 'と'
      WHEN 'da' THEN 'だ' WHEN 'di' THEN 'ぢ' WHEN 'du' THEN 'づ' WHEN 'de' THEN 'で' WHEN 'do' THEN 'ど'
      WHEN 'na' THEN 'な' WHEN 'ni' THEN 'に' WHEN 'nu' THEN 'ぬ' WHEN 'ne' THEN 'ね' WHEN 'no' THEN 'の'
      WHEN 'ha' THEN 'は' WHEN 'hi' THEN 'ひ' WHEN 'hu' THEN 'ふ' WHEN 'he' THEN 'へ' WHEN 'ho' THEN 'ほ'
      WHEN 'ba' THEN 'ば' WHEN 'bi' THEN 'び' WHEN 'bu' THEN 'ぶ' WHEN 'be' THEN 'べ' WHEN 'bo' THEN 'ぼ'
      WHEN 'pa' THEN 'ぱ' WHEN 'pi' THEN 'ぴ' WHEN 'pu' THEN 'ぷ' WHEN 'pe' THEN 'ぺ' WHEN 'po' THEN 'ぽ'
      WHEN 'ma' THEN 'ま' WHEN 'mi' THEN 'み' WHEN 'mu' THEN 'む' WHEN 'me' THEN 'め' WHEN 'mo' THEN 'も'
      WHEN 'ya' THEN 'や' WHEN 'yu' THEN 'ゆ' WHEN 'yo' THEN 'よ'
      WHEN 'ra' THEN 'ら' WHEN 'ri' THEN 'り' WHEN 'ru' THEN 'る' WHEN 're' THEN 'れ' WHEN 'ro' THEN 'ろ'
      WHEN 'wa' THEN 'わ' WHEN 'wi' THEN 'うぃ' WHEN 'we' THEN 'うぇ' WHEN 'wo' THEN 'を'
      WHEN 'fa' THEN 'ふぁ' WHEN 'fi' THEN 'ふぃ' WHEN 'fe' THEN 'ふぇ' WHEN 'fo' THEN 'ふぉ'
      WHEN 'va' THEN 'ゔぁ' WHEN 'vi' THEN 'ゔぃ' WHEN 'vu' THEN 'ゔ' WHEN 've' THEN 'ゔぇ' WHEN 'vo' THEN 'ゔぉ'
      WHEN 'ja' THEN 'じゃ' WHEN 'ji' THEN 'じ' WHEN 'ju' THEN 'じゅ' WHEN 'je' THEN 'じぇ' WHEN 'jo' THEN 'じょ'
      ELSE NULL
    END;

    IF val IS NOT NULL THEN
      out := out || val;
      i := i + 2;
      CONTINUE;
    END IF;

    val := CASE ch
      WHEN 'a' THEN 'あ' WHEN 'i' THEN 'い' WHEN 'u' THEN 'う'
      WHEN 'e' THEN 'え' WHEN 'o' THEN 'お'
      ELSE NULL
    END;
    IF val IS NOT NULL THEN
      out := out || val;
      i := i + 1;
      CONTINUE;
    END IF;

    out := out || ch;
    i := i + 1;
  END LOOP;
  RETURN out;
END;
$function$;

CREATE OR REPLACE FUNCTION public.normalize_anime_title(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO public, extensions, pg_temp
AS $function$
  SELECT regexp_replace(
    lower(normalize(coalesce(p, ''), NFKC)),
    '[^a-z0-9ぁ-んァ-ヶ一-龯々ー]+',
    '',
    'g'
  );
$function$;

-- Recompute stored readings using the corrected converter.
UPDATE public.anime
SET title_kana = CASE
  WHEN coalesce(title_japanese, '') ~ '^[ぁ-ゖァ-ヺ]' THEN title_japanese
  WHEN coalesce(title_romaji, '') <> '' THEN public.romaji_to_hiragana(title_romaji)
  ELSE title_japanese
END
WHERE title_kana IS DISTINCT FROM CASE
  WHEN coalesce(title_japanese, '') ~ '^[ぁ-ゖァ-ヺ]' THEN title_japanese
  WHEN coalesce(title_romaji, '') <> '' THEN public.romaji_to_hiragana(title_romaji)
  ELSE title_japanese
END;
