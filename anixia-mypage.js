(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const title=a=>a.title_ja||a.title_kana||a.title||"タイトル未設定";
  const status=v=>({plan_to_watch:"視聴予定",watching:"視聴中",completed:"視聴済み",on_hold:"中断・保留",dropped:"視聴をやめた"}[v]||v);
  let dashboard=null,activeTab="watch";

  function card(a,meta){
    return `<a class="anixia-library-card" href="anime-detail.html?id=${encodeURIComponent(a.id)}">
      ${a.poster_url?`<img src="${esc(a.poster_url)}" alt="" loading="lazy">`:'<div style="aspect-ratio:3/4;background:#263b59;display:grid;place-items:center;color:#91a2bb;font-weight:900">ANIXIA</div>'}
      <div><b>${esc(title(a))}</b><small>${esc(meta||[a.release_year,a.format].filter(Boolean).join(" · "))}</small></div>
    </a>`;
  }

  function renderTab(){
    const el=$("library-content");
    let items=[];
    if(activeTab==="watch")items=dashboard.watchEntries.map(a=>card(a,status(a.status)+" · "+(a.episodes_watched||0)+"話"));
    if(activeTab==="favorites")items=dashboard.favorites.map(a=>card(a,"お気に入り"));
    if(activeTab==="ratings")items=dashboard.ratings.map(a=>card(a,"評価 "+a.score+"点"));
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
      renderTab();
    }catch(e){
      console.error(e);
      $("mypage-loading").textContent="マイページを読み込めませんでした。時間をおいて再度お試しください。";
    }
  }
  document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>{activeTab=b.dataset.tab;renderTab();}));
  $("profile-form").addEventListener("submit",async e=>{
    e.preventDefault();
    try{
      const result=await ANIXIA.updateProfile((await ANIXIA.getUser()).id,{display_name:$("display-name").value,username:$("username").value,bio:$("bio").value});
      $("profile-message").textContent="プロフィールを保存しました。";
    }catch(error){console.error(error);$("profile-message").textContent="保存できませんでした。ユーザーIDの重複などを確認してください。";}
  });
  $("logout").addEventListener("click",async()=>{
    try{const {error}=await ANIXIA.getClient().auth.signOut();if(error)throw error;location.href="index.html";}
    catch(e){console.error(e);$("profile-message").textContent="ログアウトできませんでした。";}
  });
  init();
})();
