(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const en=()=>localStorage.getItem("anixia-language")==="en";
  const hasJapanese=v=>/[\u3040-\u30ff\u3400-\u9fff]/u.test(String(v||""));
  const title=a=>en()?(a.title_en||(a.title&&!hasJapanese(a.title)?a.title:"English title unavailable")):(a.title_ja||a.title_kana||a.title||"タイトル未設定");
  const status=v=>({plan_to_watch:"視聴予定",watching:"視聴中",completed:"視聴済み",on_hold:"中断・保留",dropped:"視聴をやめた"}[v]||v);
  let dashboard=null,activeTab="watch";

  function card(a,meta){
    return `<a class="anixia-library-card" href="anime-detail.html?id=${encodeURIComponent(a.id)}">
      <div class="anixia-poster anixia-list-poster">${ANIXIA.posterMarkup(a.poster_url,title(a),a.poster_credit)}</div>
      <div><b>${esc(title(a))}</b><small>${esc(meta||[a.release_year,a.format].filter(Boolean).join(" · "))}</small></div>
    </a>`;
  }

  function renderTab(){
    const el=$("library-content");
    let items=[];
    if(activeTab==="watch")items=dashboard.watchEntries.map(a=>card(a,status(a.status)+" · "+(a.episodes_watched||0)+"話"));
    if(activeTab==="favorites")items=dashboard.favorites.map(a=>card(a,"お気に入り"));
    if(activeTab==="ratings")items=dashboard.ratings.map(a=>card(a,"評価 "+a.score+"点"));
    if(activeTab==="reviews")items=dashboard.reviews.map(r=>card(r.anime,r.title+" · "+(r.is_published?"公開中":"公開審査待ち")));
    if(activeTab==="achievements")items=dashboard.achievements.map(a=>`<article class="anixia-library-card"><div style="aspect-ratio:3/4;background:#17243a;display:grid;place-items:center;color:#f2b84d;font-size:28px">★</div><div><b>${esc(a.title)}</b><small>${esc(a.description||"実績を獲得しました。")}</small></div></article>`);
    el.innerHTML=items.length?items.join(""):'<div class="anixia-library-empty" style="grid-column:1/-1">まだ登録されていません。作品ページから視聴記録やお気に入りを追加できます。</div>';
    document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab===activeTab));
  }

  async function init(){
    try{
      const user=await ANIXIA.getUser();
      $("mypage-loading").hidden=true;
      if(!user){$("mypage-login").hidden=false;return;}
      $("mypage-content").hidden=false;
      $("auth-action").textContent="マイページ";
      $("user-email").textContent=user.email||"";
      dashboard=await ANIXIA.getMyDashboard(user.id);
      const p=dashboard.profile||{};
      $("display-name").value=p.display_name||"";
      $("username").value=p.username||"";
      $("bio").value=p.bio||"";
      $("is-public").checked=p.is_public!==false;
      $("show-posts").checked=p.show_posts!==false;
      $("show-favorites").checked=p.show_favorites!==false;
      $("show-anime-follows").checked=p.show_anime_follows!==false;
      $("show-watch-status").checked=p.show_watch_status!==false;
      $("show-ratings").checked=p.show_ratings!==false;
      $("show-reviews").checked=p.show_reviews!==false;
      $("show-user-follows").checked=p.show_user_follows!==false;
      $("show-ranking").checked=p.show_ranking!==false;
      renderTab();
    }catch(e){
      console.error(e);
      $("mypage-loading").innerHTML='マイページを読み込めませんでした。時間をおいて再度お試しください。 <button type="button" id="mypage-retry">再試行</button>';
      $("mypage-retry")?.addEventListener("click", init, { once: true });
    }
  }
  document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>{activeTab=b.dataset.tab;renderTab();}));
  $("profile-form").addEventListener("submit",async e=>{
    e.preventDefault();
    try{
      const result=await ANIXIA.updateProfile((await ANIXIA.getUser()).id,{
        display_name:$("display-name").value,username:$("username").value,bio:$("bio").value,
        is_public:$("is-public").checked,show_posts:$("show-posts").checked,
        show_favorites:$("show-favorites").checked,show_anime_follows:$("show-anime-follows").checked,
        show_watch_status:$("show-watch-status").checked,show_ratings:$("show-ratings").checked,
        show_reviews:$("show-reviews").checked,show_user_follows:$("show-user-follows").checked,
        show_ranking:$("show-ranking").checked
      });
      dashboard.profile={...dashboard.profile,...result};
      $("profile-message").textContent="プロフィールを保存しました。";
    }catch(error){console.error(error);$("profile-message").textContent="保存できませんでした。ユーザーIDの重複などを確認してください。";}
  });
  $("logout").addEventListener("click",async()=>{
    try{const {error}=await ANIXIA.getClient().auth.signOut();if(error)throw error;location.href="index.html";}
    catch(e){console.error(e);$("profile-message").textContent="ログアウトできませんでした。";}
  });
  init();
})();
