(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmt=v=>({tv:"TV",movie:"劇場版",ova:"OVA",ona:"ONA",special:"特別編",web:"Web",other:"その他"}[v]||v||"未登録");
  const statusName=v=>({plan_to_watch:"視聴予定",watching:"視聴中",completed:"視聴済み",on_hold:"中断・保留",dropped:"視聴をやめた"}[v]||v);
  const id=new URLSearchParams(location.search).get("id");
  let work=null,user=null,userState=null;

  function tagList(items, label) {
    if(!items.length)return '<span class="anixia-empty">'+label+'はまだ登録されていません。</span>';
    return items.map(x=>'<span>'+esc(x.name_ja||x.name||"名称未登録")+(x.role?' · '+esc(x.role):"")+'</span>').join("");
  }
  function setError(message){$("detail-loading").hidden=true;$("detail-error").hidden=false;$("detail-error").textContent=message;}
  function renderWork(a){
    work=a;
    const name=a.title_ja||a.title_kana||a.title;
    document.title=name+"｜作品情報・視聴記録｜ANIXIA";
    const desc=(a.synopsis||name+"の作品情報を確認できます。").slice(0,150);
    document.querySelector('meta[name="description"]').content=desc;
    $("poster").src=a.poster_url||"";
    $("poster").alt=name+"のポスター";
    $("poster").hidden=!a.poster_url;
    $("title").textContent=name;
    $("subtitle").textContent=[a.title,a.title_kana].filter((v,i,arr)=>v&&v!==name&&arr.indexOf(v)===i).join(" / ");
    $("meta").innerHTML=[fmt(a.format),a.release_year,a.season,a.episode_count?String(a.episode_count)+"話":""].filter(Boolean).map(x=>'<span>'+esc(x)+'</span>').join("");
    $("genres").innerHTML=tagList(a.genres,"ジャンル");
    $("synopsis").textContent=a.synopsis||"あらすじ情報はまだ登録されていません。";
    const info=[["形式",fmt(a.format)],["放送年",a.release_year||"未登録"],["シーズン",a.season||"未登録"],["話数",a.episode_count||"未登録"],["放送状況",a.status||"未登録"],["制作会社",a.studio?(a.studio.name_ja||a.studio.name):"未登録"]];
    if(a.official_url)info.push(["公式サイト",'<a href="'+esc(a.official_url)+'" target="_blank" rel="noopener noreferrer">公式サイトを開く</a>']);
    $("info").innerHTML=info.map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+((typeof v==="string"&&v.startsWith("<a "))?v:esc(v))+'</dd>').join("");
    $("characters").innerHTML=tagList(a.characters,"キャラクター");
    $("staff").innerHTML=tagList(a.staff,"スタッフ");
    $("reviews").innerHTML=a.reviews.length?a.reviews.map(r=>'<article class="anixia-review"><b>'+esc(r.title||"レビュー")+(r.spoiler?" · ネタバレあり":"")+'</b><p>'+esc(r.body)+'</p></article>').join(""):'<div class="anixia-empty">公開レビューはまだありません。</div>';
    $("detail-loading").hidden=true;$("detail-content").hidden=false;
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
    }catch(e){console.error(e);setError("作品情報の読み込みに失敗しました。時間をおいて再度お試しください。");}
  }
  init();
})();
