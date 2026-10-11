-- Handle the explicit English-title reading AIR -> エアー in title generation and sorting.
CREATE OR REPLACE FUNCTION public.refresh_anime_title_kana()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
BEGIN
 NEW.title_kana:=CASE
  WHEN lower(normalize(coalesce(nullif(btrim(NEW.title_romaji),''),nullif(btrim(NEW.title_japanese),''),nullif(btrim(NEW.title_english),''),nullif(btrim(NEW.title),''),''), NFKC)) = 'air' THEN 'えあー'
  WHEN coalesce(NEW.title_japanese,'') ~ '^[ぁ-ゖァ-ヺ]' THEN NEW.title_japanese
  WHEN coalesce(NEW.title_romaji,'')<>'' THEN public.romaji_to_hiragana(NEW.title_romaji)
  ELSE NEW.title_japanese END;
 RETURN NEW;
END $function$
;

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
  IF s = 'air' THEN s := 'えあー'; END IF;
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

CREATE OR REPLACE FUNCTION public.anime_gojuon_key(p_romaji text, p_japanese text, p_title text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
declare s text:=lower(normalize(coalesce(p_romaji,''), NFKC)); j text:=normalize(coalesce(p_japanese,''), NFKC); out text:=''; i int:=1; tok text; base text; rank int; n text;
begin
 if j ~ '^[0-9]+' then n:=substring(j from '^[0-9]+'); out:=public.anime_gojuon_key(public.anime_number_to_romaji(n::bigint),null,null); s:=substring(j from length(n)+1); j:=s;
 elsif j ~ '^[A-Za-z]' or j !~ '^[ぁ-んァ-ヶ一-龥0-9]' then j:=''; s:=lower(normalize(coalesce(p_romaji,p_title,''), NFKC));
 elsif j ~ '[ぁ-んァ-ヶ]' then s:=lower(j);
 end if;
 if lower(normalize(coalesce(nullif(btrim(p_romaji),''),nullif(btrim(p_title),''),''), NFKC)) = 'air' then
  s:='えあー'; j:='えあー';
 end if;
 if j ~ '[ぁ-んァ-ヶ]' then
  s:=translate(s,'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモヤャユュヨョラリルレロワヲン','ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもやゃゆゅよょらりるれろわをん');
  s:=regexp_replace(s,'[ー・･、。！？（）()［］「」『』【】〈〉《》…‥―‐‑‒–—_:;,.!?"''/\\ ]','','g'); i:=1;
  while i<=length(s) loop
   tok:=null;
   if substr(s,i,1)='っ' then tok:='つ'; else
    foreach base in array ARRAY['きゃ','きゅ','きょ','ぎゃ','ぎゅ','ぎょ','しゃ','しゅ','しょ','じゃ','じゅ','じょ','ちゃ','ちゅ','ちょ','ぢゃ','ぢゅ','ぢょ','にゃ','にゅ','にょ','ひゃ','ひゅ','ひょ','びゃ','びゅ','びょ','ぴゃ','ぴゅ','ぴょ','みゃ','みゅ','みょ','りゃ','りゅ','りょ','ふぁ','ふぃ','ふぇ','ふぉ','うぃ','うぇ','うぉ','しぇ','じぇ','ちぇ','つぁ','つぃ','つぇ','つぉ','てぃ','でぃ','でゅ','とぅ','どぅ'] loop
     if substr(s,i,length(base))=base then tok:=base; exit; end if;
    end loop;
    if tok is null then tok:=substr(s,i,1); end if;
   end if;
   select r into rank from (values ('あ',1),('い',2),('う',3),('え',4),('お',5),('か',6),('き',7),('く',8),('け',9),('こ',10),('が',6),('ぎ',7),('ぐ',8),('げ',9),('ご',10),('さ',11),('し',12),('す',13),('せ',14),('そ',15),('ざ',11),('じ',12),('ず',13),('ぜ',14),('ぞ',15),('た',16),('ち',17),('つ',18),('て',19),('と',20),('だ',16),('ぢ',17),('づ',18),('で',19),('ど',20),('な',21),('に',22),('ぬ',23),('ね',24),('の',25),('は',26),('ひ',27),('ふ',28),('へ',29),('ほ',30),('ば',26),('び',27),('ぶ',28),('べ',29),('ぼ',30),('ぱ',26),('ぴ',27),('ぷ',28),('ぺ',29),('ぽ',30),('ま',31),('み',32),('む',33),('め',34),('も',35),('や',36),('ゆ',37),('よ',38),('ら',39),('り',40),('る',41),('れ',42),('ろ',43),('わ',44),('を',45),('ん',46)) v(c,r) where c=left(tok,1);
   out:=out||lpad(coalesce(rank,99)::text,2,'0'); i:=i+length(tok);
  end loop;
 else
  s:=regexp_replace(s,'[^a-z0-9]','','g');
  while s<>'' loop
   if s ~ '^[0-9]+' then n:=substring(s from '^[0-9]+'); s:=substring(s from length(n)+1); s:=public.anime_number_to_romaji(n::bigint)||s; continue; end if;
   tok:=null;
   foreach base in array ARRAY['kya','kyu','kyo','gya','gyu','gyo','sha','shu','sho','ja','ju','jo','cha','chu','cho','nya','nyu','nyo','hya','hyu','hyo','bya','byu','byo','pya','pyu','pyo','mya','myu','myo','rya','ryu','ryo','shi','chi','tsu','fu','fa','fi','fe','fo','she','je','che','a','i','u','e','o','ka','ki','ku','ke','ko','ga','gi','gu','ge','go','sa','su','se','so','za','zu','ze','zo','ta','te','to','da','de','do','na','ni','nu','ne','no','ha','hi','he','ho','ba','bi','be','bo','pa','pi','pe','po','ma','mi','mu','me','mo','ya','yu','yo','ra','ri','ru','re','ro','wa','wo','n'] loop
    if left(s,length(base))=base then tok:=base; exit; end if;
   end loop;
   if tok is null then out:=out||'99'; s:=substring(s from 2); continue; end if;
   select r into rank from (values ('a',1),('i',2),('u',3),('e',4),('o',5),('ka',6),('ki',7),('ku',8),('ke',9),('ko',10),('ga',6),('gi',7),('gu',8),('ge',9),('go',10),('sa',11),('shi',12),('su',13),('se',14),('so',15),('za',11),('ji',12),('zu',13),('ze',14),('zo',15),('ta',16),('chi',17),('tsu',18),('te',19),('to',20),('da',16),('di',17),('du',18),('de',19),('do',20),('na',21),('ni',22),('nu',23),('ne',24),('no',25),('ha',26),('hi',27),('fu',28),('he',29),('ho',30),('ba',26),('bi',27),('bu',28),('be',29),('bo',30),('pa',26),('pi',27),('pu',28),('pe',29),('po',30),('ma',31),('mi',32),('mu',33),('me',34),('mo',35),('ya',36),('yu',37),('yo',38),('ra',39),('ri',40),('ru',41),('re',42),('ro',43),('wa',44),('wo',45),('n',46)) v(c,r) where c=case when tok in ('kya','kyu','kyo','gya','gyu','gyo') then 'ki' when tok in ('sha','shu','sho','ja','ju','jo','shi') then 'shi' when tok in ('cha','chu','cho','chi') then 'chi' when tok in ('nya','nyu','nyo') then 'ni' when tok in ('hya','hyu','hyo') then 'hi' when tok in ('bya','byu','byo','pya','pyu','pyo') then 'hi' when tok in ('mya','myu','myo') then 'mi' when tok in ('rya','ryu','ryo') then 'ri' when tok in ('fa','fi','fe','fo','fu') then 'fu' else tok end;
   out:=out||lpad(coalesce(rank,99)::text,2,'0'); s:=substring(s from length(tok)+1);
  end loop;
 end if;
 return out;
end $function$
;

UPDATE public.anime SET title_kana='えあー' WHERE lower(normalize(coalesce(nullif(btrim(title_romaji),''),nullif(btrim(title_japanese),''),nullif(btrim(title_english),''),nullif(btrim(title),''),''), NFKC))='air' AND title_kana IS DISTINCT FROM 'えあー';
