/* ANIXIA: 全ページ共通の認証ナビゲーション */
(function(){
  "use strict";
  function ready(){
    /* ログイン／ログアウト導線はトップページだけに表示する */
    var page=(location.pathname.split("/").pop()||"index.html").toLowerCase();
    if(page!=="index.html" && page!=="") return;
    if(!window.ANIXIAAuth)return setTimeout(ready,50);
    ANIXIAAuth.init().then(render).catch(function(){render(null);});
    window.addEventListener("animecia-auth",function(e){render(e.detail&&e.detail.user);});
  }
  function render(user){
    var loggedIn=!!(user&&!user.is_anonymous&&(user.email_confirmed_at||user.confirmed_at));
    var links=Array.from(document.querySelectorAll("#auth-link,#footer-login-link"));
    var link=links[0]||null;
    if(!link){
      var host=document.querySelector(".site-header .nav-actions")||document.querySelector("header .nav-actions");
      if(!host){
        var nav=document.querySelector(".site-header .container.nav")||document.querySelector("header nav")||document.querySelector(".wrap.head");
        if(nav){
          host=document.createElement("div");
          host.className="nav-actions animecia-auth-actions";
          nav.appendChild(host);
        }
      }
      if(host){
        link=document.createElement("a");
        link.id="auth-link";
        link.className="nav-btn primary animecia-auth-link";
        host.appendChild(link);
        links=[link].concat(links);
      }
    }
    if(!links.length)return;
    links.forEach(function(item){
      item.textContent=loggedIn?"ログアウト":"ログイン";
      item.href=loggedIn?"#":"login.html";
      item.classList.toggle("primary",!loggedIn);
      item.classList.toggle("logout",loggedIn);
      item.setAttribute("aria-label",loggedIn?"ログアウト":"ログイン");
      item.onclick=loggedIn?async function(e){
        e.preventDefault();
        item.setAttribute("aria-busy","true");
        item.textContent="ログアウト中…";
        try{
          await ANIXIAAuth.signOut();
          location.replace("index.html");
        }catch(err){
          console.error(err);
          item.removeAttribute("aria-busy");
          render(ANIXIAAuth.state.user);
        }
      }:null;
      item.style.display="";
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready,{once:true});
  else ready();
})();