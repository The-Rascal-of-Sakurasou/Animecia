(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmt=v=>({tv:"TV",movie:"劇場版",ova:"OVA",ona:"ONA",special:"特別編",web:"Web",other:"その他"}[v]||v||"未登録");
  const statusName=v=>({plan_to_watch:"視聴予定",watching:"視聴中",completed:"視聴済み",on_hold:"中断・保留",dropped:"視聴をやめた"}[v]||v);
  const roleLabel=v=>({voice_actor:"声優",director:"監督",screenwriter:"脚本",series_composition:"シリーズ構成",character_design:"キャラクターデザイン",producer:"プロデューサー",original_creator:"原作"}[v]||v);
  const characterRoleLabel=v=>({main:"メインキャラクター",supporting:"サブキャラクター",background:"その他"}[v]||v);
  const id=new URLSearchParams(location.search).get("id");
  let work=null,user=null,userState=null;

  function tagList(items, label) {
    if(!items.length)return '<span class="anixia-empty">'+label+'はまだ登録されていません。</span>';
    return items.map(x=>'<span>'+esc(x.name_ja||x.name||"名称未登録")+(x.role?' · '+esc(roleLabel(x.role)):"")+'</span>').join("");
  }
  function setPosterFallback(name){
    $("poster-fallback").innerHTML='<span class="anixia-poster-brand">ANIXIA</span><strong class="anixia-poster-title">'+esc(name)+'</strong><small class="anixia-poster-caption">TITLE ARCHIVE</small>';
    $("poster-fallback").hidden=false;
  }
  function setError(message){$("detail-loading").hidden=true;$("detail-error").hidden=false;$("detail-error").textContent=message;}
  function renderWork(a){
    work=a;
    const name=a.title_ja||a.title_kana||a.title;
    document.title=name+"｜作品情報・視聴記録｜ANIXIA";
    const desc=(a.synopsis||name+"の作品情報を確認できます。").slice(0,150);
    document.querySelector('meta[name="description"]').content=desc;
    $("poster").alt=name+"のポスター";
    $("poster").hidden=!a.poster_url;
    $("poster-fallback").hidden=!!a.poster_url;
    if(!a.poster_url) setPosterFallback(name);
    if(a.poster_url){
      $("poster").src=a.poster_url;
      $("poster").onload=()=>{$("poster").classList.toggle("anixia-poster-logo",$("poster").naturalWidth>$("poster").naturalHeight*1.15);};
      $("poster").onerror=()=>{$("poster").hidden=true;setPosterFallback(name);};
    }else $("poster").removeAttribute("src");
    $("title").textContent=name;
    $("subtitle").textContent=[a.title,a.title_kana].filter((v,i,arr)=>v&&v!==name&&arr.indexOf(v)===i).join(" / ");
    $("meta").innerHTML=[fmt(a.format),a.release_year,a.season,a.episode_count?String(a.episode_count)+"話":""].filter(Boolean).map(x=>'<span>'+esc(x)+'</span>').join("");
    $("genres").innerHTML=tagList(a.genres||[],"ジャンル");
    $("tags").innerHTML=tagList(a.tags||[],"タグ");
    $("series").innerHTML=tagList(a.series||[],"シリーズ");
    $("organizations").innerHTML=tagList(a.organizations||[],"制作団体");
    const relationLabels={sequel:"続編",prequel:"前編",side_story:"外伝",spin_off:"スピンオフ",alternative_version:"別バージョン・リメイク",summary:"総集編",parent_story:"本編・親作品",adaptation:"メディア化・原作関係",other:"その他"};
    const related=a.related_works||[];
    $("related-works").innerHTML=related.length?related.map(r=>{
      const direction=r.direction==="incoming"?"関連元":"関連先";
      return '<a href="anime-detail.html?id='+encodeURIComponent(r.id)+'"><span>'+esc(r.title_ja||r.title||"作品名未登録")+'</span><small>'+esc(direction+" · "+(relationLabels[r.relation_type]||r.relation_type))+'</small></a>';
    }).join(""):'<div class="anixia-empty">関連作品はまだ登録されていません。</div>';
    const episodes=a.episodes||[];
    $("episodes").innerHTML=episodes.length?episodes.map(e=>{
      const number=String(e.episode_number||"");
      const numberLabel=number?(number.includes("第")||number.includes("話")?number:"第"+number+"話"):"話数未登録（表示順 "+String(e.episode_order||"-")+")";
      const title=e.title_ja||e.title||"サブタイトル未登録";
      const date=e.aired_at?" · "+e.aired_at:"";
      return '<article class="anixia-detail-episode"><b>'+esc(numberLabel+" · "+title)+'</b><p>'+esc(date+(e.synopsis?" · "+e.synopsis:""))+'</p></article>';
    }).join(""):'<div class="anixia-empty">公開済みのエピソード情報はありません。</div>';
    $("synopsis").textContent=a.synopsis||"あらすじ情報はまだ登録されていません。";
    const synopsisSource=$("synopsis-source");
    const synopsisCredit=a.synopsis_credit||{};
    if(synopsisCredit.source_url && synopsisCredit.license_url){
      const sourceTitle=synopsisCredit.source_title||"出典";
      const articleUrl=esc(synopsisCredit.source_url);
      const revisionUrl=esc(synopsisCredit.revision_url||synopsisCredit.source_url);
      const licenseUrl=esc(synopsisCredit.license_url);
      synopsisSource.hidden=false;
      synopsisSource.innerHTML='出典：<a href="'+articleUrl+'" target="_blank" rel="noopener noreferrer">'+esc(sourceTitle)+'</a> · <a href="'+revisionUrl+'" target="_blank" rel="noopener noreferrer">'+esc(synopsisCredit.attribution||"提供元")+'・改訂履歴</a> · <a href="'+licenseUrl+'" target="_blank" rel="noopener noreferrer">'+esc(synopsisCredit.license||"ライセンス")+'</a>';
    }else{
      synopsisSource.hidden=true;
      synopsisSource.textContent="";
    }
    const posterSource=$("poster-source");
    const posterCredit=a.poster_credit||{};
    if(posterCredit.source_url && posterCredit.license_url){
      const sourceName=posterCredit.source==="wikimedia_commons"?"Wikimedia Commons":"画像出典";
      posterSource.hidden=false;
      posterSource.innerHTML='画像出典：<a href="'+esc(posterCredit.source_url)+'" target="_blank" rel="noopener noreferrer">'+sourceName+'</a> · '+esc(posterCredit.attribution||"作者情報なし")+' · <a href="'+esc(posterCredit.license_url)+'" target="_blank" rel="noopener noreferrer">'+esc(posterCredit.license||"ライセンス")+'</a>';
    }else{
      posterSource.hidden=true;
      posterSource.textContent="";
    }
    const studioNames=(a.studios||[]).map(s=>s.name_ja||s.name).filter(Boolean);
    const info=[["形式",fmt(a.format)],["放送年",a.release_year||"未登録"],["シーズン",a.season||"未登録"],["話数",a.episode_count||a.episodes_count||"未登録"],["放送状況",a.status||"未登録"],["制作会社",studioNames.join("・")||(a.studio?(a.studio.name_ja||a.studio.name):"未登録")]];
    if(a.official_url)info.push(["公式サイト",'<a href="'+esc(a.official_url)+'" target="_blank" rel="noopener noreferrer">公式サイトを開く</a>']);
    $("info").innerHTML=info.map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+((typeof v==="string"&&v.startsWith("<a "))?v:esc(v))+'</dd>').join("");
    const characterItems=a.characters||[];
    $("characters").innerHTML=characterItems.length?characterItems.map(character=>{
      const voiceActors=(character.voice_actors||[]).map(person=>esc(person.name_ja||person.name)).join("、");
      return '<span>'+esc(character.name_ja||character.name||"名称未登録")+(character.role?' · '+esc(characterRoleLabel(character.role)):"")+(voiceActors?' · CV：'+voiceActors:"")+'</span>';
    }).join(""):'<span class="anixia-empty">キャラクターはまだ登録されていません。</span>';
    $("staff").innerHTML=tagList(a.staff,"スタッフ");
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
