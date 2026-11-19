(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const type = params.get("type");
  const id = params.get("id");
  const types = {
    person:{table:"people",title:"PERSON PROFILE",name:r=>r.name_ja||"日本語表記未登録",subtitle:r=>r.person_type||"人物・スタッフ"},
    character:{table:"characters",title:"CHARACTER PROFILE",name:r=>r.name_ja||"日本語表記未登録",subtitle:()=>"キャラクター"},
    studio:{table:"studios",title:"STUDIO PROFILE",name:r=>r.name_ja||"日本語表記未登録",subtitle:()=>"アニメ制作会社"}
  };
  const esc = value => String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const roleName = role => ({voice_actor:"声優",director:"監督",screenwriter:"脚本",producer:"プロデューサー",composer:"作曲",series_composition:"シリーズ構成",character_design:"キャラクターデザイン",original_creator:"原作"}[role]||role||"スタッフ");
  function infoRow(label,value) { return value ? "<dt>"+esc(label)+"</dt><dd>"+esc(value)+"</dd>" : ""; }
  function renderWorks(works, roles) {
    const roleMap = new Map();
    (roles||[]).forEach(row=>{const arr=roleMap.get(row.anime_id)||[];arr.push(row);roleMap.set(row.anime_id,arr);});
    $("entity-works").innerHTML = works.length ? works.map(work=>{
      const roleText=(roleMap.get(work.id)||[]).map(r=>roleName(r.role)).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join("・");
      const title=work.title_ja||work.title_kana||work.title||"タイトル未設定";
      const meta=[work.release_year,({tv:"TV",movie:"劇場版",ova:"OVA",ona:"ONA",special:"特別編",web:"Web"}[work.format]||work.format)].filter(Boolean).join(" · ");
      return '<a class="entity-work" href="anime-detail.html?id='+encodeURIComponent(work.id)+'"><span><b>'+esc(title)+'</b><small>'+esc(meta)+'</small></span>'+(roleText?'<span class="entity-role">'+esc(roleText)+'</span>':'')+'</a>';
    }).join("") : '<div class="entity-empty">関連する公開作品はまだ登録されていません。</div>';
  }
  async function getWorksForLinks(rows) {
    const ids=[...new Set(rows.map(row=>row.anime_id).filter(Boolean))];
    if(!ids.length)return [];
    return ANIXIA.getPublicAnimeByIds(ids);
  }
  async function init() {
    if(!types[type]||!id){throw new Error("URLに詳細情報が指定されていません。");}
    const spec=types[type], db=ANIXIA.getClient();
    const result=await db.from(spec.table).select("*").eq("id",id).maybeSingle();
    if(result.error)throw result.error;
    if(!result.data)throw new Error("該当するデータが見つかりません。");
    const entity=result.data, name=spec.name(entity)||"名称未登録";
    $("entity-name").textContent=name;
    $("entity-avatar").textContent=Array.from(name)[0]||"A";
    $("entity-kicker").textContent=spec.title;
    $("entity-subtitle").textContent=spec.subtitle(entity);
    document.title=name+"｜ANIXIA";
    const rows=[];
    if(type==="person"){
      const credits=await db.from("anime_staff").select("anime_id,role,character_id").eq("person_id",id).limit(500);
      if(credits.error)throw credits.error;
      rows.push(...(credits.data||[]));
      const works=await getWorksForLinks(rows); renderWorks(works,rows);
      const characterIds=[...new Set(rows.map(x=>x.character_id).filter(Boolean))];
      if(characterIds.length){
        const chars=await db.from("characters").select("id,name,name_ja").in("id",characterIds.slice(0,100)).limit(100);
        if(chars.error)throw chars.error;
        $("entity-related").innerHTML=(chars.data||[]).length?(chars.data||[]).map(c=>'<a class="entity-work" href="entity-detail.html?type=character&id='+encodeURIComponent(c.id)+'"><b>'+esc(c.name_ja||"日本語表記未登録")+'</b><small>担当キャラクター</small></a>').join(""):'<div class="entity-empty">キャラクター情報はまだありません。</div>';
      }else $("entity-related").innerHTML='<div class="entity-empty">担当キャラクター情報はまだありません。</div>';
      $("entity-info").innerHTML=infoRow("読み仮名",entity.name_kana)+infoRow("英語名",entity.name_en)+infoRow("別名",entity.nickname)+infoRow("誕生日",entity.birthday)+infoRow("区分",entity.person_type)+infoRow("公式サイト",entity.official_url)+infoRow("Wikipedia",entity.wikipedia_url);
      $("works-heading").textContent="参加作品・担当作品";
      $("related-heading").textContent="担当キャラクター";
    }else if(type==="character"){
      const appearances=await db.from("anime_characters").select("anime_id,role").eq("character_id",id).limit(300);
      if(appearances.error)throw appearances.error;
      rows.push(...(appearances.data||[]));
      const works=await getWorksForLinks(rows); renderWorks(works,rows);
      const credits=await db.from("anime_staff").select("anime_id,role,person_id").eq("character_id",id).limit(300);
      if(credits.error)throw credits.error;
      const personIds=[...new Set((credits.data||[]).map(x=>x.person_id).filter(Boolean))];
      if(personIds.length){
        const people=await db.from("people").select("id,name,name_ja,person_type").in("id",personIds.slice(0,100)).limit(100);
        if(people.error)throw people.error;
        $("entity-related").innerHTML=(people.data||[]).length?people.data.map(person=>'<a class="entity-work" href="entity-detail.html?type=person&id='+encodeURIComponent(person.id)+'"><b>'+esc(person.name_ja||"日本語表記未登録")+'</b><small>'+esc(roleName(person.person_type))+'</small></a>').join(""):'<div class="entity-empty">担当スタッフ情報はまだありません。</div>';
      }else $("entity-related").innerHTML='<div class="entity-empty">担当声優・スタッフ情報はまだありません。</div>';
      $("entity-info").innerHTML=infoRow("読み仮名",entity.name_kana)+infoRow("英語名",entity.name_en)+infoRow("別名",entity.nickname)+infoRow("説明",entity.description);
      $("works-heading").textContent="登場作品";
      $("related-heading").textContent="担当声優・スタッフ";
    }else{
      const studioLinks=await db.from("anime_studios").select("anime_id,production_role").eq("studio_id",id).order("display_order",{ascending:true}).limit(500);
      if(studioLinks.error)throw studioLinks.error;
      const studioAnimeIds=[...new Set((studioLinks.data||[]).map(row=>row.anime_id).filter(Boolean))];
      const works=await getWorksForLinks(studioAnimeIds.map(anime_id=>({anime_id})));
      const productionRoles=studioLinks.data||[];
      renderWorks(works,productionRoles.map(row=>({anime_id:row.anime_id,role:row.production_role})));
      $("entity-related").innerHTML='<div class="entity-empty">制作会社に関する追加情報は順次収録します。</div>';
      $("entity-info").innerHTML=infoRow("読み仮名",entity.name_kana)+infoRow("英語名",entity.name_en)+infoRow("公式サイト",entity.website_url)+infoRow("Wikipedia",entity.wikipedia_url);
      $("works-heading").textContent="制作作品";
      $("related-heading").textContent="関連情報";
    }
    $("entity-loading").hidden=true;$("entity-content").hidden=false;
  }
  init().catch(error=>{
    console.error("ANIXIA entity detail failed",error);
    $("entity-loading").hidden=true;$("entity-error").hidden=false;
    $("entity-error").textContent=error.message||"情報を読み込めませんでした。";
  });
})();