(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const isEnglish=()=>localStorage.getItem("anixia-language")==="en";
  const hasJapanese=value=>/[\u3040-\u30ff\u3400-\u9fff]/u.test(String(value||""));
  const value=(row,ja,en,fallback)=>isEnglish()?((row?.[en]&&!hasJapanese(row[en])?row[en]:null)||(row?.name_en&&!hasJapanese(row.name_en)?row.name_en:null)||fallback):(row?.[ja]||fallback);
  const label=(ja,en)=>isEnglish()?en:ja;
  const englishTitle=row=>row?.title_en||(row?.title&&!hasJapanese(row.title)?row.title:"English title unavailable");
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmt=v=>({tv:"TV",movie:label("劇場版","Movie"),ova:"OVA",ona:"ONA",special:label("特別編","Special"),web:"Web",other:label("その他","Other")}[v]||v||label("未登録","Not available"));
  const statusName=v=>({plan_to_watch:"視聴予定",watching:"視聴中",completed:"視聴済み",on_hold:"中断・保留",dropped:"視聴をやめた"}[v]||v);
  const roleLabel=v=>({voice_actor:label("声優","Voice Actor"),director:label("監督","Director"),screenwriter:label("脚本","Screenwriter"),series_composition:label("シリーズ構成","Series Composition"),character_design:label("キャラクターデザイン","Character Design"),producer:label("プロデューサー","Producer"),original_creator:label("原作","Original Creator")}[v]||v);
  const characterRoleLabel=v=>({main:label("メインキャラクター","Main Character"),supporting:label("サブキャラクター","Supporting Character"),background:label("その他","Other")}[v]||v);
  const id=new URLSearchParams(location.search).get("id");
  let work=null,user=null,userState=null;

  function tagList(items, label) {
    if(!items.length)return '<span class="anixia-empty">'+(isEnglish()?"No entries yet.":label+"はまだ登録されていません。")+'</span>';
    return items.map(x=>'<span>'+esc(value(x,"name_ja","name",isEnglish()?"Name unavailable":"名称未登録"))+(x.role?' · '+esc(x.role_en||roleLabel(x.role)):"")+'</span>').join("");
  }
  function setPosterFallback(name){
    $("poster-fallback").innerHTML='<span class="anixia-poster-brand">ANIXIA</span><strong class="anixia-poster-title">'+esc(name)+'</strong><small class="anixia-poster-caption">TITLE ARCHIVE</small>';
    $("poster-fallback").hidden=false;
  }
  function setError(message){$("detail-loading").hidden=true;$("detail-error").hidden=false;$("detail-error").textContent=message;}
  function renderWork(a){
    work=a;
    const name=isEnglish()?englishTitle(a):(a.title_ja||a.title_kana||a.title);
    document.title=isEnglish()?name+" | Anime Details & Watchlist | ANIXIA":name+"｜作品情報・視聴記録｜ANIXIA";
    const synopsis=isEnglish()?(a.synopsis_en||a.description_en||"English synopsis is not available yet."):(a.synopsis||"あらすじ情報はまだ登録されていません。");
    const desc=(synopsis||name).slice(0,150);
    document.querySelector('meta[name="description"]').content=desc;
    $("poster").alt=isEnglish()?name+" poster":name+"のポスター";
    $("poster").hidden=!a.poster_url;
    $("poster-fallback").hidden=!!a.poster_url;
    if(!a.poster_url) setPosterFallback(name);
    if(a.poster_url){
      $("poster").src=a.poster_url;
      $("poster").onload=()=>{$("poster").classList.toggle("anixia-poster-logo",$("poster").naturalWidth>$("poster").naturalHeight*1.15);};
      $("poster").onerror=()=>{$("poster").hidden=true;setPosterFallback(name);};
    }else $("poster").removeAttribute("src");
    $("title").textContent=name;
    $("subtitle").textContent=(isEnglish()?[a.title_ja,a.title_kana]:[a.title,a.title_kana]).filter((v,i,arr)=>v&&v!==name&&arr.indexOf(v)===i).join(" / ");
    const season=({winter:label("冬","Winter"),spring:label("春","Spring"),summer:label("夏","Summer"),autumn:label("秋","Autumn")})[String(a.season||"").toLowerCase()]||a.season;
    $("meta").innerHTML=[fmt(a.format),a.release_year,season,a.episode_count?String(a.episode_count)+(isEnglish()?" episodes":"話"):""].filter(Boolean).map(x=>'<span>'+esc(x)+'</span>').join("");
    $("genres").innerHTML=tagList(a.genres||[],"ジャンル");
    $("tags").innerHTML=tagList(a.tags||[],"タグ");
    $("series").innerHTML=tagList(a.series||[],"シリーズ");
    $("organizations").innerHTML=tagList(a.organizations||[],"制作団体");
    const relationLabels=isEnglish()?{sequel:"Sequel",prequel:"Prequel",side_story:"Side Story",spin_off:"Spin-off",alternative_version:"Alternate Version / Remake",summary:"Compilation",parent_story:"Parent Story",adaptation:"Adaptation",other:"Other"}:{sequel:"続編",prequel:"前編",side_story:"外伝",spin_off:"スピンオフ",alternative_version:"別バージョン・リメイク",summary:"総集編",parent_story:"本編・親作品",adaptation:"メディア化・原作関係",other:"その他"};
    const related=a.related_works||[];
    $("related-works").innerHTML=related.length?related.map(r=>{
      const direction=r.direction==="incoming"?label("関連元","Related From"):label("関連先","Related To");
      return '<a href="anime-detail.html?id='+encodeURIComponent(r.id)+'"><span>'+esc((isEnglish()?englishTitle(r):value(r,"title_ja","title","作品名未登録")))+'</span><small>'+esc(direction+" · "+(relationLabels[r.relation_type]||r.relation_type))+'</small></a>';
    }).join(""):'<div class="anixia-empty">'+(isEnglish()?"No related anime have been added yet.":"関連作品はまだ登録されていません。")+'</div>';
    const episodes=a.episodes||[];
    $("episodes").innerHTML=episodes.length?episodes.map(e=>{
      const number=String(e.episode_number||"");
      const numberLabel=number?(isEnglish()?"Episode "+number:(number.includes("第")||number.includes("話")?number:"第"+number+"話")):(isEnglish()?"Episode number unavailable (order "+String(e.episode_order||"-")+")":"話数未登録（表示順 "+String(e.episode_order||"-")+")");
      const title=isEnglish()?(e.title_en||englishTitle(e)):(e.title_ja||e.title||"サブタイトル未登録");
      const date=e.aired_at?" · "+(isEnglish()?"Aired: ":"")+e.aired_at:"";
      return '<article class="anixia-detail-episode"><b>'+esc(numberLabel+" · "+title)+'</b><p>'+esc(date+(isEnglish()?(e.synopsis_en?" · "+e.synopsis_en:""):(e.synopsis?" · "+e.synopsis:"")))+'</p></article>';
    }).join(""):'<div class="anixia-empty">'+(isEnglish()?"No published episode information is available.":"公開済みのエピソード情報はありません。")+'</div>';
    $("synopsis").textContent=synopsis;
    const synopsisSource=$("synopsis-source");
    const synopsisCredit=a.synopsis_credit||{};
    if(isEnglish() && !a.synopsis_en && a.description_en && a.source_id){
      synopsisSource.hidden=false;
      synopsisSource.innerHTML='Short description from <a href="https://www.wikidata.org/wiki/'+encodeURIComponent(a.source_id)+'" target="_blank" rel="noopener noreferrer">Wikidata</a>.';
    }else if(synopsisCredit.source_url && synopsisCredit.license_url){
      const sourceTitle=synopsisCredit.source_title||(isEnglish()?"Source":"出典");
      const articleUrl=esc(synopsisCredit.source_url);
      const revisionUrl=esc(synopsisCredit.revision_url||synopsisCredit.source_url);
      const licenseUrl=esc(synopsisCredit.license_url);
      synopsisSource.hidden=false;
      synopsisSource.innerHTML=(isEnglish()?"Source: ":'出典：')+'<a href="'+articleUrl+'" target="_blank" rel="noopener noreferrer">'+esc(sourceTitle)+'</a> · <a href="'+revisionUrl+'" target="_blank" rel="noopener noreferrer">'+esc(synopsisCredit.attribution||(isEnglish()?"Provider":"提供元"))+'・改訂履歴</a> · <a href="'+licenseUrl+'" target="_blank" rel="noopener noreferrer">'+esc(synopsisCredit.license||(isEnglish()?"License":"ライセンス"))+'</a>';
    }else{
      synopsisSource.hidden=true;
      synopsisSource.textContent="";
    }
    const posterSource=$("poster-source");
    if(posterSource){
      posterSource.hidden=true;
      posterSource.textContent="";
      posterSource.removeAttribute("aria-label");
    }
    const studioNames=(a.studios||[]).map(s=>value(s,"name_ja","name",isEnglish()?"Name unavailable":"日本語表記未登録")).filter(Boolean);
    const statusMap={finished_airing:label("放送終了","Finished Airing"),currently_airing:label("放送中","Currently Airing"),not_yet_aired:label("放送前","Not Yet Aired"),upcoming:label("放送予定","Upcoming"),cancelled:label("中止","Cancelled")};
    const info=isEnglish()?[["Format",fmt(a.format)],["Release Year",a.release_year||"Not available"],["Season",season||"Not available"],["Episodes",a.episode_count||a.episodes_count||"Not available"],["Status",statusMap[a.status]||a.status||"Not available"],["Studios",studioNames.join(", ")||(a.studio?(a.studio.name_en||(a.studio.name&&!hasJapanese(a.studio.name)?a.studio.name:"Name unavailable")):"Not available")]]:[["形式",fmt(a.format)],["放送年",a.release_year||"未登録"],["シーズン",season||"未登録"],["話数",a.episode_count||a.episodes_count||"未登録"],["放送状況",statusMap[a.status]||a.status||"未登録"],["制作会社",studioNames.join("・")||(a.studio?(a.studio.name_ja||"日本語表記未登録"):"未登録")]];
    if(a.official_url)info.push([label("公式サイト","Official Website"),'<a href="'+esc(a.official_url)+'" target="_blank" rel="noopener noreferrer">'+label("公式サイトを開く","Open Official Website")+'</a>']);
    $("info").innerHTML=info.map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+((typeof v==="string"&&v.startsWith("<a "))?v:esc(v))+'</dd>').join("");
    const characterItems=a.characters||[];
    $("characters").innerHTML=characterItems.length?characterItems.map(character=>{
      const characterName=value(character,"name_ja","name",isEnglish()?"Name unavailable":"日本語表記未登録");
      const characterLink=character.id?'<a href="entity-detail.html?type=character&id='+encodeURIComponent(character.id)+'">'+esc(characterName)+'</a>':esc(characterName);
      const voiceActors=(character.voice_actors||[]).map(person=>person.id?'<a href="entity-detail.html?type=person&id='+encodeURIComponent(person.id)+'">'+esc(value(person,"name_ja","name",isEnglish()?"Name unavailable":"日本語表記未登録"))+'</a>':esc(person.name_ja||"日本語表記未登録")).join("、");
      return '<span>'+characterLink+(character.role?' · '+esc(characterRoleLabel(character.role)):"")+(voiceActors?' · CV：'+voiceActors:"")+'</span>';
    }).join(""):'<span class="anixia-empty">'+(isEnglish()?"No characters have been added yet.":"キャラクターはまだ登録されていません。")+'</span>';
    const staffItems=a.staff||[];
    $("staff").innerHTML=staffItems.length?staffItems.map(person=>{
      const personName=value(person,"name_ja","name",isEnglish()?"Name unavailable":"日本語表記未登録");
      const link=person.id?'<a href="entity-detail.html?type=person&id='+encodeURIComponent(person.id)+'">'+esc(personName)+'</a>':esc(personName);
      return '<span>'+link+(person.role?' · '+esc(roleLabel(person.role)):"")+'</span>';
    }).join(""):'<span class="anixia-empty">'+(isEnglish()?"No staff information has been added yet.":"スタッフはまだ登録されていません。")+'</span>';
    $("reviews").innerHTML=a.reviews.length?a.reviews.map(r=>'<article class="anixia-review"><b>'+esc(r.title||"レビュー")+(r.spoiler?" · ネタバレあり":"")+'</b><p>'+esc(r.body)+'</p></article>').join(""):'<div class="anixia-empty">公開レビューはまだありません。</div>';
    $("detail-loading").hidden=true;$("detail-content").hidden=false;
  }

  function renderReviewForm(){
    const container=$("review-form-container");
    if(!user){
      container.innerHTML='<p class="anixia-empty">レビューを投稿するには<a href="login.html">ログイン</a>してください。</p>';
      return;
    }
    container.innerHTML=`
      <form id="review-form" class="anixia-detail-actions">
        <label>タイトル<input id="review-title" type="text" maxlength="120" required></label>
        <label>レビュー本文<textarea id="review-body" rows="5" maxlength="5000" required style="width:100%;border:1px solid #354a67;border-radius:8px;padding:10px;background:#0b1423;color:#f2f5fa"></textarea></label>
        <label style="display:flex;align-items:center;gap:8px"><input id="review-spoiler" type="checkbox" style="width:auto;min-height:0">ネタバレを含む</label>
        <button type="submit">レビューを投稿</button>
        <p id="review-message" class="anixia-detail-message" aria-live="polite"></p>
      </form>`;
    $("review-form").addEventListener("submit",async event=>{
      event.preventDefault();
      const button=$("review-form").querySelector("button");
      button.disabled=true;
      $("review-message").textContent="投稿しています…";
      try{
        await ANIXIA.createReview(work.id,user.id,{
          title:$("review-title").value,
          body:$("review-body").value,
          spoiler:$("review-spoiler").checked
        });
        $("review-form").reset();
        $("review-message").textContent="レビューを受け付けました。公開前の確認が完了すると掲載されます。";
      }catch(error){
        console.error(error);
        $("review-message").textContent="投稿できませんでした。入力内容を確認してください。";
      }finally{button.disabled=false;}
    });
  }

  function renderActions(){
    if(!user){
      $("actions").innerHTML='<p class="anixia-empty">ログインすると、お気に入り・視聴状況・個人評価を保存できます。</p><a class="nav-btn primary" href="login.html">ログイン</a>';
      return;
    }
    const watch=userState.watch||{};
    $("actions").innerHTML=`
      <button id="favorite-button" class="secondary" type="button">${userState.favorite?"お気に入りを解除":"お気に入りに追加"}</button>
      <label>視聴状況<select id="watch-status">
        <option value="">未設定</option><option value="plan_to_watch">視聴予定</option><option value="watching">視聴中</option><option value="completed">視聴済み</option><option value="on_hold">中断・保留</option><option value="dropped">視聴をやめた</option>
      </select></label>
      <label>視聴話数<input id="episodes-watched" type="number" min="0" max="10000" value="${Number(watch.episodes_watched)||0}"></label>
      <button id="save-watch" type="button">視聴記録を保存</button>
      <label>自分の評価（1〜10点）<select id="rating"><option value="">未評価</option>${Array.from({length:10},(_,i)=>'<option value="'+(i+1)+'">'+(i+1)+'点</option>').join("")}</select></label>
      <button id="save-rating" class="secondary" type="button">評価を保存</button>`;
    $("watch-status").value=watch.status||"";
    $("rating").value=userState.rating?String(userState.rating.score):"";
    $("favorite-button").addEventListener("click",async()=>{
      try{userState.favorite=await ANIXIA.toggleFavorite(work.id,user.id,userState.favorite);renderActions();$("action-message").textContent=userState.favorite?"お気に入りに追加しました。":"お気に入りを解除しました。";}
      catch(e){console.error(e);$("action-message").textContent="保存できませんでした。ログイン状態を確認してください。";}
    });
    $("save-watch").addEventListener("click",async()=>{
      try{const status=$("watch-status").value;if(!status){$("action-message").textContent="視聴状況を選択してください。";return}
        await ANIXIA.saveWatchEntry(work.id,user.id,status,$("episodes-watched").value);
        userState.watch={status,episodes_watched:Number($("episodes-watched").value)||0};
        $("action-message").textContent="視聴記録を保存しました。";
      }catch(e){console.error(e);$("action-message").textContent="視聴記録を保存できませんでした。";}
    });
    $("save-rating").addEventListener("click",async()=>{
      try{const score=$("rating").value;if(!score){$("action-message").textContent="評価を選択してください。";return}
        await ANIXIA.saveRating(work.id,user.id,score);userState.rating={score:Number(score)};
        $("action-message").textContent="評価を保存しました。";
      }catch(e){console.error(e);$("action-message").textContent="評価を保存できませんでした。";}
    });
  }

  async function init(){
    if(!id){setError("作品IDが指定されていません。作品検索から作品を選択してください。");return;}
    try{
      work=await ANIXIA.getAnime(id);
      if(!work){setError("作品が見つかりません。作品一覧へ戻ってください。");return;}
      renderWork(work);
      try{user=await ANIXIA.getUser();}catch(_){user=null;}
      if(user){try{userState=await ANIXIA.getUserAnimeState(work.id,user.id);}catch(e){console.error(e);userState={favorite:false,watch:null,rating:null};}}
      else userState={favorite:false,watch:null,rating:null};
      renderActions();
      renderReviewForm();
    }catch(e){console.error(e);setError("作品情報の読み込みに失敗しました。時間をおいて再度お試しください。");}
  }
  init();
})();
