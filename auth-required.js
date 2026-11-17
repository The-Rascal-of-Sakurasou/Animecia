/* ANIXIA: 認証必須ページ・操作の共通ガード */
(function(){
  "use strict";
  function boot(){
    if(!window.ANIXIAAuth)return setTimeout(boot,50);
    ANIXIAAuth.init().then(apply).catch(function(){apply(null);});
  }
  function login(){ANIXIAAuth.redirectToLogin();}
  function disable(el){
    if(!el)return;
    if("disabled" in el)el.disabled=true;
    el.setAttribute("aria-disabled","true");
    el.classList.add("auth-required-disabled");
  }
  function notice(parent,text){
    if(!parent||parent.querySelector(".auth-required-notice"))return;
    var n=document.createElement("div");n.className="auth-required-notice";
    n.innerHTML="<strong>ログインが必要です</strong><br>"+text+" <a href=\"login.html?redirect="+encodeURIComponent(location.pathname.split("/").pop()+location.search)+"\">ログインする</a>";
    parent.insertBefore(n,parent.firstChild);
  }
  function apply(user){
    var path=location.pathname.split("/").pop()||"index.html";
    var logged=!!(user&&(user.email_confirmed_at||user.confirmed_at)&&!user.is_anonymous);
    if(["mypage.html","memo.html","messages.html"].indexOf(path)>=0&&!logged){
      document.body.style.visibility="hidden";
      login();
      return;
    }
    document.body.style.visibility="";
    var selectors={
      community:["#post-body","#post-image","#photo-button","#post-submit","#user-search","#user-search-btn"],
      memo:["#clear","#memo-search","#search-button"],
      detail:["#favorite-button","#memo-button","#review-title","#review-rating","#review-content","#review-spoiler","#review-submit-button","#review-cancel-edit","#watch-status","#watch-progress","#status-save","#user-rating","#rating-save","#follow-button","#notify-episode"]
    };
    var key=path==="community.html"?"community":path==="memo.html"?"memo":path==="anime-detail.html"?"detail":null;
    if(logged||!key)return;
    var style=document.createElement("style");style.textContent=".auth-required-disabled{opacity:.5!important;cursor:not-allowed!important}.auth-required-notice{margin:0 0 12px;padding:12px 14px;border:1px solid #f0c36d;border-radius:10px;background:#fff8e6;color:#5f4700;font-size:13px;line-height:1.6}.auth-required-notice a{font-weight:800;color:#b45309}";document.head.appendChild(style);
    (selectors[key]||[]).forEach(function(sel){document.querySelectorAll(sel).forEach(disable);});
    if(key==="community")notice(document.querySelector(".composer"),"投稿・返信・いいね・リポスト・保存などの操作にはログインが必要です。");
    if(key==="memo")notice(document.querySelector(".memo-panel"),"メモの保存・変更にはログインが必要です。");
    if(key==="detail")notice(document.querySelector(".action-area"),"お気に入り・評価・視聴状況・レビュー・フォローなどの機能にはログインが必要です。");
  }
  document.addEventListener("click",function(e){
    if(ANIXIAAuth&&ANIXIAAuth.isLoggedIn())return;
    var t=e.target.closest&&e.target.closest('[data-act="like"],[data-act="repost"],[data-act="bookmark"],[data-act="reply"],[data-act="send-reply"],[data-act="delete"],[data-add],[data-remove]');
    if(t){e.preventDefault();e.stopImmediatePropagation();login();}
  },true);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();