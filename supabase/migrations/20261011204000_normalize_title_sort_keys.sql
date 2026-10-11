-- Normalize full-width letters/digits before generating sort keys.
CREATE OR REPLACE FUNCTION public.anime_title_sort_key(p_title_romaji text, p_title_japanese text, p_title_native text, p_title text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
declare
  s text;
  rest text;
  n bigint;
  d bigint;
  m text[];
begin
  s := lower(normalize(coalesce(nullif(btrim(p_title_romaji),''),nullif(btrim(p_title_japanese),''),nullif(btrim(p_title_native),''),nullif(btrim(p_title),''),''), NFKC));
  s := translate(s,'ēéèêëāīūōáàäöü','eeeeeaiuoaaaou');
  s := regexp_replace(s,'^[^a-z0-9ぁ-んァ-ヶ一-龯々ー]+','');

  -- 数字は英語読みではなく、日本語の読みをローマ字化して比較する。
  m := regexp_match(s,'^([0-9]+)[.]([0-9]+)(.*)$');
  if m is not null then
    n := m[1]::bigint;
    d := m[2]::bigint;
    rest := m[3];
    s := public.anime_number_to_romaji(n) || 'ten' || public.anime_number_to_romaji(d) || rest;
  else
    m := regexp_match(s,'^([0-9]+)(.*)$');
    if m is not null then
      n := m[1]::bigint;
      rest := m[2];
      s := public.anime_number_to_romaji(n) || rest;
    end if;
  end if;

  s := lower(s);
  s := regexp_replace(s,'[^a-zぁ-んァ-ヶ一-龯々ー0-9]+','','g');
  return s;
end;
$function$
;
