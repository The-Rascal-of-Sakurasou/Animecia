(() => {
  "use strict";
  if (window.__ANIXIA_GLOBAL_HEADER_INSTALLED__) return;
  window.__ANIXIA_GLOBAL_HEADER_INSTALLED__ = true;
  const ROOT = "/anixia/";
  const navItems = [
    ["作品一覧", "anime.html"],
    ["作品を探す", "discover.html"],
    ["人物・団体", "entities.html"],
    ["今期アニメ", "season.html"],
    ["ジャンル", "genres.html"],
    ["ランキング", "ranking.html"],
    ["おすすめ診断", "recommendations.html"],
    ["クイズ", "quiz.html"],
    ["作品比較", "compare.html"],
    ["コミュニティ", "community.html"],
    ["ユーザー検索", "user-search.html"],
    ["メッセージ", "messages.html"],
  ];

  function addStyles() {
    if (document.getElementById("anixia-global-header-style")) return;
    const style = document.createElement("style");
    style.id = "anixia-global-header-style";
    style.textContent = `
      .site-header,.anixia-global-header{position:fixed!important;top:0!important;left:0!important;right:0!important;z-index:9999!important;width:100%!important;background:#000!important;color:#fff!important;border:0!important;border-bottom:1px solid #222!important;box-shadow:none!important}
      .anixia-global-header-inner{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:16px!important;width:100%!important;max-width:1500px!important;min-height:68px!important;margin:0!important;padding:8px 18px!important;box-sizing:border-box!important;text-align:left!important}
      .anixia-global-header .anixia-logo{display:inline-flex!important;flex:0 0 auto!important;color:#03AF6A!important;text-decoration:none!important;font:850 25px/1 Inter,"Segoe UI",Arial,sans-serif!important;letter-spacing:-1.7px!important;white-space:nowrap!important}
      .anixia-global-header .anixia-logo-xia{color:#1DA1F2!important}
      .anixia-global-nav{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:2px!important;flex:0 1 auto!important;min-width:0!important;overflow-x:auto!important;scrollbar-width:none!important}
      .anixia-global-nav::-webkit-scrollbar{display:none!important}
      .anixia-global-nav a{display:inline-flex!important;align-items:center!important;min-height:36px!important;padding:7px 8px!important;border-radius:5px!important;color:#fff!important;background:transparent!important;text-decoration:none!important;font-size:12px!important;font-weight:650!important;white-space:nowrap!important}
      .anixia-global-nav a,.anixia-global-nav a:visited,.anixia-global-nav a:hover,.anixia-global-nav a:focus,.anixia-global-nav a[aria-current="page"]{color:#FFFFFF!important;opacity:1!important;background:transparent!important}
      .anixia-global-nav a:hover,.anixia-global-nav a[aria-current="page"]{background:rgba(255,255,255,.07)!important}
      .anixia-header-actions{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:7px!important;flex:0 0 auto!important;margin:0!important}
      .anixia-header-actions .anixia-header-button{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:36px!important;padding:0 12px!important;border:1px solid #03AF6A!important;border-radius:6px!important;background:#03AF6A!important;color:#fff!important;text-decoration:none!important;font-family:inherit!important;font-size:12px!important;font-weight:750!important;white-space:nowrap!important;cursor:pointer!important}
      .anixia-header-actions .anixia-header-button:hover{background:#028f56!important;border-color:#028f56!important;color:#FFFFFF!important}
      .anixia-header-actions #account-link,.anixia-header-actions #account-link:visited,.anixia-header-actions #account-link:hover{color:#FFFFFF!important}
      .anixia-header-actions [hidden]{display:none!important}
      footer.anixia-global-footer{display:block!important;width:100%!important;margin:64px 0 0!important;padding:0!important;background:#000!important;color:#fff!important;border:0!important;border-top:1px solid #222!important;box-shadow:none!important}
      .anixia-footer-inner{width:100%!important;max-width:1200px!important;margin:0!important;padding:28px 18px 18px!important;box-sizing:border-box!important;text-align:left!important}
      .anixia-footer-main{margin:0 0 18px!important}
      .anixia-footer-logo{display:inline-flex!important;color:#03AF6A!important;text-decoration:none!important;font:850 24px/1 Inter,"Segoe UI",Arial,sans-serif!important;letter-spacing:-1.7px!important}
      .anixia-footer-logo .anixia-logo-xia{color:#1DA1F2!important}
      .anixia-footer-nav{display:flex!important;flex-wrap:wrap!important;justify-content:flex-start!important;gap:9px 18px!important;padding:0 0 16px!important;border:0!important}
      .anixia-footer-nav a{color:#fff!important;text-decoration:none!important;font-size:12px!important}
      .anixia-footer-nav a:hover{color:#fff!important}
      .anixia-footer-bottom{display:flex!important;justify-content:flex-start!important;padding-top:12px!important;border-top:1px solid #222!important;color:#fff!important;font-size:10px!important}
      .anixia-admin-login{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:36px!important;margin-top:10px!important;padding:0 12px!important;border:1px solid #000!important;border-radius:6px!important;color:#000!important;background:#000!important;font-size:12px!important;font-weight:750!important;text-decoration:none!important;opacity:1!important;cursor:pointer!important}
      .anixia-admin-login,.anixia-admin-login:visited,.anixia-admin-login:hover,.anixia-admin-login:focus,.anixia-admin-login:active{color:#000!important;background:#000!important;background-color:#000!important;border-color:#000!important;outline:none!important;box-shadow:none!important;opacity:1!important}
      @media(max-width:900px){
        .anixia-global-header-inner{flex-wrap:wrap!important;gap:8px 12px!important;padding:9px 14px!important}
        .anixia-global-nav{order:3!important;flex:1 1 100%!important;width:100%!important}
        .anixia-global-nav a{padding:6px 8px!important}
        .anixia-header-actions{margin-left:0!important}
      }
      /* Mobile header: stack brand, actions and horizontally scrollable navigation. */
      @media(max-width:760px){
        .anixia-global-header-inner{display:grid!important;grid-template-columns:minmax(0,1fr)!important;grid-template-rows:auto auto auto!important;align-items:center!important;gap:9px!important;width:100%!important;min-height:0!important;padding:10px 14px!important;box-sizing:border-box!important}
        .anixia-global-header .anixia-logo{grid-row:1!important;justify-self:start!important;font-size:24px!important}
        .anixia-header-actions{grid-row:2!important;display:flex!important;flex-wrap:nowrap!important;justify-content:space-between!important;align-items:center!important;gap:7px!important;width:100%!important;min-width:0!important;margin:0!important}
        .anixia-header-actions .anixia-header-button{flex:1 1 0!important;min-width:0!important;min-height:38px!important;padding:0 7px!important;font-size:12px!important;white-space:nowrap!important}
        .anixia-global-nav{grid-row:3!important;display:flex!important;flex:0 0 auto!important;flex-wrap:nowrap!important;align-items:center!important;justify-content:flex-start!important;gap:5px!important;width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;padding:0 0 2px!important;overflow-x:auto!important;overflow-y:hidden!important;white-space:nowrap!important;overscroll-behavior-x:contain!important;-webkit-overflow-scrolling:touch!important}
        .anixia-global-nav a{flex:0 0 auto!important;display:inline-flex!important;min-width:max-content!important;padding:7px 9px!important;font-size:12px!important;line-height:1.4!important;white-space:nowrap!important}
      }
      @media(max-width:420px){
        .anixia-global-header .anixia-logo{font-size:22px!important}
        .anixia-header-actions{gap:5px!important}
        .anixia-header-actions .anixia-header-button{min-height:33px!important;padding:0 8px!important;font-size:11px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function installHeader() {
    // Remove every page-specific header before creating the single shared header.
    document.querySelectorAll("body > header, header.site-header, header.anixia-global-header").forEach(node => node.remove());
    const header = document.createElement("header");
    header.className = "site-header anixia-global-header";
    header.setAttribute("role", "banner");
    header.style.setProperty("position", "fixed", "important");
    header.style.setProperty("top", "0px", "important");
    header.style.setProperty("left", "0px", "important");
    header.style.setProperty("right", "0px", "important");
    header.style.setProperty("z-index", "2147483647", "important");
    header.style.setProperty("width", "100%", "important");
    header.style.setProperty("transform", "none", "important");
    header.style.setProperty("background", "#000000", "important");
    header.style.setProperty("background-color", "#000000", "important");
    header.style.setProperty("color", "#FFFFFF", "important");
    header.innerHTML = `
      <div class="anixia-global-header-inner">
        <a class="anixia-logo" href="${ROOT}" aria-label="ANIXIA ホーム">ANI<span class="anixia-logo-xia">XIA</span></a>
        <nav class="anixia-global-nav" aria-label="メインナビゲーション">
          ${navItems.map(([label,path]) => `<a href="${ROOT}${path}">${label}</a>`).join("")}
        </nav>
        <div class="anixia-header-actions">
          <a class="anixia-header-button" id="account-link" href="${ROOT}login.html">ログイン</a>
          <button class="anixia-header-button" id="home-logout" type="button" hidden>ログアウト</button>
          <button class="anixia-header-button" id="language-toggle" type="button">EN</button>
          <a class="anixia-header-button" id="mypage-link" href="${ROOT}mypage.html">マイページ</a>
        </div>
      </div>`;
    header.querySelectorAll(".anixia-global-nav a").forEach(a => {
      a.style.setProperty("color", "#FFFFFF", "important");
      a.style.setProperty("opacity", "1", "important");
    });
    header.querySelectorAll(".anixia-header-actions .anixia-header-button").forEach(a => a.style.setProperty("color", "#FFFFFF", "important"));
    const logo = header.querySelector(".anixia-logo");
    if (logo) logo.style.setProperty("color", "#03AF6A", "important");
    const logoAccent = header.querySelector(".anixia-logo-xia");
    if (logoAccent) logoAccent.style.setProperty("color", "#1DA1F2", "important");
    const current = location.pathname.replace(/^.*\/anixia\//, "");
    header.querySelectorAll(".anixia-global-nav a").forEach(a => {
      const path = a.getAttribute("href").replace(ROOT, "");
      if (path === current || (!path && !current)) a.setAttribute("aria-current", "page");
    });
    const language = header.querySelector("#language-toggle");
    language.textContent = (localStorage.getItem("anixia-language") || "ja") === "ja" ? "EN" : "日本語";
    language.addEventListener("click", () => {
      const next = (localStorage.getItem("anixia-language") || "ja") === "ja" ? "en" : "ja";
      if (window.ANIXIA_SET_LANGUAGE) window.ANIXIA_SET_LANGUAGE(next);
      else { localStorage.setItem("anixia-language", next); location.reload(); }
    });

    // Keep the fixed header in the body; never reparent it during scrolling.
    document.body.prepend(header);
    const updateHeaderSpace = () => {
      document.body.style.setProperty("padding-top", header.offsetHeight + "px", "important");
    };
    updateHeaderSpace();
    if (window.ResizeObserver) new ResizeObserver(updateHeaderSpace).observe(header);
    window.addEventListener("resize", updateHeaderSpace, {passive:true});
    setupAuth(header);
  }

  function loadScript(src, marker) {
    return new Promise((resolve,reject) => {
      const existing = document.querySelector(`script[${marker}]`);
      if (existing?.dataset.loaded === "true") return resolve();
      const script = existing || document.createElement("script");
      if (!existing) {
        script.src = src;
        script.async = true;
        script.setAttribute(marker, "");
        document.head.appendChild(script);
      }
      script.addEventListener("load", () => { script.dataset.loaded = "true"; resolve(); }, {once:true});
      script.addEventListener("error", reject, {once:true});
      if (existing && (window.supabase || window.ANIXIA)) resolve();
    });
  }

  async function setupAuth(header) {
    const login = header.querySelector("#account-link");
    const logout = header.querySelector("#home-logout");
    const render = user => {
      const signedIn = !!(user && !user.is_anonymous);
      login.hidden = signedIn;
      logout.hidden = !signedIn;
    };
    try {
      if (!window.supabase) {
        await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", "data-anixia-supabase-sdk");
      }
      if (!window.ANIXIA || typeof window.ANIXIA.getClient !== "function") {
        await loadScript(ROOT + "anixia-client.js", "data-anixia-auth-client");
      }
      const client = window.ANIXIA.getClient();
      const {data,error} = await client.auth.getUser();
      if (error) throw error;
      render(data?.user || null);
      client.auth.onAuthStateChange((_event,session) => render(session?.user || null));
      logout.addEventListener("click", async () => {
        logout.disabled = true;
        logout.textContent = "ログアウト中…";
        try {
          const {error:signOutError} = await client.auth.signOut();
          if (signOutError) throw signOutError;
          location.href = ROOT;
        } catch (error) {
          console.error("ANIXIA logout failed",error);
          logout.disabled = false;
          logout.textContent = "ログアウト";
          alert("ログアウトできませんでした。時間をおいて再度お試しください。");
        }
      });
    } catch (error) {
      console.warn("ANIXIA authentication status unavailable",error);
      render(null);
    }
  }

  function installFooter() {
    const existing = document.querySelector("footer");
    const footer = existing || document.createElement("footer");
    footer.className = "anixia-global-footer";
    footer.style.setProperty("background", "#000000", "important");
    footer.style.setProperty("background-color", "#000000", "important");
    footer.style.setProperty("color", "#FFFFFF", "important");
    footer.style.setProperty("width", "100%", "important");
    footer.style.setProperty("position", "fixed", "important");
    footer.style.setProperty("left", "0", "important");
    footer.style.setProperty("right", "0", "important");
    footer.style.setProperty("bottom", "0", "important");
    footer.style.setProperty("z-index", "2147482999", "important");
    footer.style.setProperty("margin", "0", "important");
    footer.style.setProperty("max-height", "38vh", "important");
    footer.style.setProperty("overflow-y", "auto", "important");
    footer.innerHTML = `
      <div class="anixia-footer-inner">
        <div class="anixia-footer-main"><a class="anixia-footer-logo" href="${ROOT}" aria-label="ANIXIA ホーム">ANI<span class="anixia-logo-xia">XIA</span></a></div>
        <nav class="anixia-footer-nav" aria-label="フッターナビゲーション">
          <a href="${ROOT}data-sources.html">データ出典</a>
          <a href="${ROOT}terms.html">利用規約</a>
          <a href="${ROOT}privacy.html">プライバシーポリシー</a>
          <a href="${ROOT}operator.html">運営情報</a>
          <a href="https://x.com/anime_love_p" target="_blank" rel="noopener noreferrer">お問い合わせ</a>
        </nav>
        <div class="anixia-footer-bottom">© ANIXIA</div>
        <a class="anixia-admin-login" href="${ROOT}admin-login.html" aria-label="管理者ログイン">管理者ログイン</a>
      </div>`;
    document.querySelectorAll("footer").forEach(node => { if (node !== footer) node.remove(); });
    document.body.appendChild(footer);
    const updateFooterSpace = () => document.body.style.setProperty("padding-bottom", (footer.offsetHeight + 18) + "px", "important");
    updateFooterSpace();
    if (window.ResizeObserver) new ResizeObserver(updateFooterSpace).observe(footer);
    window.addEventListener("resize", updateFooterSpace, {passive:true});
  }

  function init() {
    addStyles();
    installHeader();
    installFooter();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();