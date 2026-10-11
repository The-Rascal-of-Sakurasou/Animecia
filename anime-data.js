/* Animecia canonical anime data contract — 2026-10-08 */
(function(global){
  "use strict";
  const seasonNames={WINTER:"冬",SPRING:"春",SUMMER:"夏",FALL:"秋"};
  const formatNames={TV:"TV",TV_SHORT:"TVショート",MOVIE:"劇場版",OVA:"OVA",ONA:"ONA",SPECIAL:"特別編",MUSIC:"Music"};
  const statusNames={FINISHED:"放送終了",RELEASING:"放送中",NOT_YET_RELEASED:"放送前",CANCELLED:"中止",HIATUS:"休止中"};
  function title(a){
    return a?.title_japanese||a?.title_native||a?._japanese_aliases?.[0]||
      (/[ぁ-んァ-ン一-龯々ー]/.test(String(a?.title||""))?a.title:"")||
      a?.title_user_preferred||a?.title_romaji||a?.title_english||a?.english_title||a?.title||"タイトル未設定";
  }
  function subtitle(a){
    const main=title(a);
    return [a?.title_english,a?.english_title,a?.title_romaji,a?.title_user_preferred,a?.title_native,a?.title_japanese,a?.title]
      .find(v=>v&&v!==main)||"";
  }
  function year(a){
    if(a?.season_year!==null&&a?.season_year!==undefined&&a?.season_year!=="") return String(a.season_year);
    const y=String(a?.start_date||"").slice(0,4);
    return /^\d{4}$/.test(y)?y:"";
  }
  function season(a){ return seasonNames[a?.season]||a?.season||"—"; }
  function seasonCode(a){ return a?.season||""; }
  function format(a){ return formatNames[a?.format]||a?.format||"—"; }
  function status(a){ return statusNames[a?.status]||a?.status||"—"; }
  function image(a){ return a?.cover_image||""; }
  function score(a){
    const v=a?._animecia_rating??a?.average_rating??a?.average_score;
    if(v===null||v===undefined||v==="") return null;
    const n=Number(v);
    return Number.isFinite(n)?(a?.average_rating!=null||a?._animecia_rating!=null?n:n/10):null;
  }
  // 「ローマ字化 → 五十音順」を全ページ共通で使用する。
  // title_romaji がある場合は必ずそれを基準にし、ローマ字そのものを
  // ヘボン式の音節として解析して五十音の行・段へ変換して比較する。
  function reading(a){
    const source=String(a?.title_romaji||a?.title_english||a?.english_title||a?.title_native||a?.title||"").normalize("NFKC");
    return source.toLowerCase().replace(/[ー\s\-‐‑‒–—―・.,!?()[\]{}'"\\/:;_+&]/g,"").replace(/[^a-z0-9]/g,"");
  }
  function numberToRomaji(n){
    if(!Number.isFinite(n))return "";
    if(n===0)return "zero";
    const ones=["","ichi","ni","san","yon","go","roku","nana","hachi","kyuu"];
    const under10000=v=>{
      let r="",th=Math.floor(v/1000),h=Math.floor(v%1000/100),t=Math.floor(v%100/10),o=v%10;
      if(th)r+=(th===3?"sanzen":th===8?"hassen":ones[th]+"sen");
      if(h)r+=(h===3?"sanbyaku":h===6?"roppyaku":h===8?"happyaku":ones[h]+"hyaku");
      if(t)r+=(t===1?"juu":ones[t]+"juu");
      if(o)r+=ones[o];
      return r;
    };
    if(n<10000)return under10000(n);
    if(n<100000000)return under10000(Math.floor(n/10000))+"man"+under10000(n%10000);
    return String(n);
  }
  function compare(a,b){
    // 各ローマ字音節を五十音の位置へ変換。
    // 例: kya→きゃ→「き」行、sha→しゃ→「し」行、chi→ち、tsu→つ。
    const syllables=[
      ["kya","ki"],["kyu","ki"],["kyo","ki"],["gya","ki"],["gyu","ki"],["gyo","ki"],
      ["sha","shi"],["shu","shi"],["sho","shi"],["ja","shi"],["ju","shi"],["jo","shi"],["jya","shi"],["jyu","shi"],["jyo","shi"],
      ["cha","chi"],["chu","chi"],["cho","chi"],["tya","chi"],["tyu","chi"],["tyo","chi"],
      ["nya","ni"],["nyu","ni"],["nyo","ni"],["hya","hi"],["hyu","hi"],["hyo","hi"],
      ["bya","hi"],["byu","hi"],["byo","hi"],["pya","hi"],["pyu","hi"],["pyo","hi"],
      ["mya","mi"],["myu","mi"],["myo","mi"],["rya","ri"],["ryu","ri"],["ryo","ri"],
      ["fa","fu"],["fi","fu"],["fe","fu"],["fo","fu"],["fya","fu"],["fyu","fu"],["fyo","fu"],
      ["wi","i"],["we","e"],["wo","wo"],["she","shi"],["je","shi"],["che","chi"],
      ["tsa","tsu"],["tsi","tsu"],["tse","tsu"],["tso","tsu"],["ti","chi"],["di","chi"],["du","tsu"],
      ["a","a"],["i","i"],["u","u"],["e","e"],["o","o"],
      ["ka","ka"],["ki","ki"],["ku","ku"],["ke","ke"],["ko","ko"],
      ["ga","ka"],["gi","ki"],["gu","ku"],["ge","ke"],["go","ko"],
      ["sa","sa"],["shi","shi"],["su","su"],["se","se"],["so","so"],
      ["za","sa"],["ji","shi"],["zu","su"],["ze","se"],["zo","so"],
      ["ta","ta"],["chi","chi"],["tsu","tsu"],["te","te"],["to","to"],
      ["da","ta"],["de","te"],["do","to"],
      ["na","na"],["ni","ni"],["nu","nu"],["ne","ne"],["no","no"],
      ["ha","ha"],["hi","hi"],["fu","fu"],["he","he"],["ho","ho"],
      ["ba","ha"],["bi","hi"],["bu","fu"],["be","he"],["bo","ho"],
      ["pa","ha"],["pi","hi"],["pu","fu"],["pe","he"],["po","ho"],
      ["ma","ma"],["mi","mi"],["mu","mu"],["me","me"],["mo","mo"],
      ["ya","ya"],["yu","yu"],["yo","yo"],
      ["ra","ra"],["ri","ri"],["ru","ru"],["re","re"],["ro","ro"],
      ["wa","wa"],["wo","wo"],["n","n"]
    ];
    const baseOrder=["a","i","u","e","o","ka","ki","ku","ke","ko","sa","shi","su","se","so","ta","chi","tsu","te","to","na","ni","nu","ne","no","ha","hi","fu","he","ho","ma","mi","mu","me","mo","ya","yu","yo","ra","ri","ru","re","ro","wa","wo","n"];
    const map=new Map(syllables);
    const rank=new Map(baseOrder.map((x,i)=>[x,i]));
    const key=s=>{
      s=reading(s);
      const result=[];
      let i=0;
      while(i<s.length){
        if(/[0-9]/.test(s[i])){
          let j=i;while(j<s.length&&/[0-9]/.test(s[j]))j++;
          const n=Number(s.slice(i,j));
          s=numberToRomaji(n)+s.slice(j);continue;
        }
        let hit=null;
        for(const [romaji,base] of syllables){if(s.startsWith(romaji,i)&&(hit===null||romaji.length>hit[0].length))hit=[romaji,base];}
        if(hit){result.push(rank.get(hit[1]));i+=hit[0].length;}
        else {result.push(999);i++;}
      }
      return result;
    };
    const x=key(a),y=key(b);
    const len=Math.max(x.length,y.length);
    for(let i=0;i<len;i++){
      if(x[i]===undefined)return -1;
      if(y[i]===undefined)return 1;
      if(x[i]!==y[i])return x[i]-y[i];
    }
    return reading(a).localeCompare(reading(b),"en");
  }
  function genres(a){
    const out=[];
    (Array.isArray(a?.anime_genres)?a.anime_genres:[]).forEach(r=>{
      const g=r?.genres;if(g?.name&&!out.some(x=>String(x.name)===String(g.name)))out.push({id:g.id??null,name:g.name});
    });
    if(a?.genre)String(a.genre).split(/[,、/]/).map(x=>x.trim()).filter(Boolean).forEach(name=>{
      if(!out.some(x=>x.name===name))out.push({id:null,name});
    });
    return out;
  }
  async function withEngagement(client,rows){
    const source=Array.isArray(rows)?rows:[];
    const ids=[...new Set(source.map(a=>Number(a?.id)).filter(Number.isInteger))];
    const map=new Map();
    for(let i=0;i<ids.length;i+=500){
      try{
        const {data,error}=await client.from("anime_engagement_summary")
          .select("anime_id,average_rating,rating_count,favorite_count,review_count")
          .in("anime_id",ids.slice(i,i+500));
        if(error){
          console.warn("AnimeciaData.withEngagement: engagement summary unavailable; catalog data will still be shown.",error);
          break;
        }
        (data||[]).forEach(x=>map.set(String(x.anime_id),x));
      }catch(error){
        console.warn("AnimeciaData.withEngagement: engagement summary request failed; catalog data will still be shown.",error);
        break;
      }
    }
    return source.map(a=>({...a,
      _animecia_rating:map.get(String(a.id))?.average_rating??null,
      _animecia_engagement:map.get(String(a.id))||null
    }));
  }
  function isPublic(a){
    // Client-side guard mirrors the database catalog policy.
    // Unknown origin remains eligible unless a non-Japanese origin is confirmed.
    if(!a || a.anime_verification_status!=="verified" || a.catalog_policy_decision==="exclude") return false;
    const format=String(a.format||"").toUpperCase();
    const allowedFormats=["TV","TV_SHORT","MOVIE","OVA","OAV","ONA","SPECIAL"];
    if(!allowedFormats.includes(format)) return false;
    if(!a.start_date || String(a.start_date)<"1963-01-01") return false;
    if(a.original_country_code && String(a.original_country_code).toUpperCase()!=="JP") return false;
    if(a.original_country_status==="verified_non_jp") return false;
    if(a.duplicate_status==="duplicate" || a.is_sensitive_visual===true) return false;
    const broadcast=["TV","TV_SHORT"].includes(format);
    if(a.is_adult===true && !broadcast) return false;
    if(a.is_preschool===true && !broadcast) return false;
    // is_kids alone is not an exclusion.
    return true;
  }
  global.AnimeciaData={title,subtitle,year,season,seasonCode,format,status,image,score,reading,compare,genres,withEngagement,isPublic,seasonNames,formatNames,statusNames};
})(window);
