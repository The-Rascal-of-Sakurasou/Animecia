(() => {
  const HOME = "/anixia/";
  const LOGO_HTML = 'ANI<span class="anixia-logo-xia">XIA</span>';

  // Always load the latest shared stylesheet, including pages without performance.js.
  if (!document.querySelector('link[data-anixia-unified-theme]')) {
    const theme = document.createElement("link");
    theme.rel = "stylesheet";
    theme.href = new URL("site-theme.css?v=anixia-unified-all-pages-20261119c", document.currentScript?.src || location.href).href;
    theme.dataset.anixiaUnifiedTheme = "true";
    document.head.appendChild(theme);
  }

  const install = () => {
    let header = document.querySelector("header.site-header, .site-header");
    if (!header) {
      header = document.createElement("header");
      header.className = "site-header anixia-global-header";
      document.body.insertBefore(header, document.body.firstChild);
    }

    let container = header.querySelector(".anixia-global-header-inner, .header-inner, .container.nav, .anixia-shell, .wrap, .container");
    if (!container) {
      container = document.createElement("div");
      container.className = "anixia-global-header-inner";
      while (header.firstChild) container.appendChild(header.firstChild);
      header.appendChild(container);
    }

    let logo = container.querySelector("a.anixia-logo, a.brand, a.logo");
    if (!logo) {
      logo = document.createElement("a");
      logo.className = "anixia-logo";
      container.insertBefore(logo, container.firstChild);
    }
    logo.classList.add("anixia-logo");
    logo.href = HOME;
    logo.setAttribute("aria-label", "ANIXIA ホーム");
    logo.setAttribute("title", "ANIXIA ホーム");
    logo.innerHTML = LOGO_HTML;

    let nav = container.querySelector("nav");
    if (!nav) {
      nav = document.createElement("nav");
      nav.className = "anixia-global-nav";
      nav.setAttribute("aria-label", "メインナビゲーション");
      nav.innerHTML = [
        ["ホーム", "/anixia/"],
        ["作品データベース", "/anixia/anime.html"],
        ["今期アニメ", "/anixia/season.html"],
        ["ランキング", "/anixia/ranking.html"],
        ["人物・団体", "/anixia/entities.html"],
        ["コミュニティ", "/anixia/community.html"]
      ].map(([label, href]) => `<a href="${href}">${label}</a>`).join("");
      container.appendChild(nav);
    }

    let actions = container.querySelector(".anixia-header-actions");
    if (!actions) {
      actions = document.createElement("div");
      actions.className = "anixia-header-actions";
      container.appendChild(actions);
    }

    document.querySelectorAll(".auth-panel > a").forEach((link) => {
      if (link.textContent.trim().replace(/\\s+/g, "") === "ANIXIA") link.remove();
    });

    if (!document.getElementById("anixia-global-header-style")) {
      const style = document.createElement("style");
      style.id = "anixia-global-header-style";
      style.textContent = `
        .site-header,.anixia-global-header{display:block!important;width:100%!important;text-align:left!important}
        .anixia-global-header-inner,.site-header .header-inner,.site-header .container,.site-header .container.nav,.anixia-global-header .header-inner,.anixia-global-header .container,.anixia-global-header .container.nav,.anixia-global-header .wrap{
          display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:20px!important;
          width:min(1200px,100%)!important;min-height:66px!important;margin:0 auto!important;padding:0 22px!important;text-align:left!important;
        }
        .site-header nav,.anixia-global-header nav,.main-nav,.site-nav,.nav-links{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:8px!important;flex:0 1 auto!important;min-width:0!important;margin:0!important;text-align:left!important;overflow-x:auto}
        .anixia-global-nav a{color:#fff!important;text-decoration:none!important;white-space:nowrap!important;padding:8px 10px!important;font-size:12px!important;font-weight:650!important}
        .anixia-global-nav a:hover{color:#03AF6A!important}
        .anixia-header-actions{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:8px!important;margin-left:0!important}
        .site-header .header-actions,.site-header .nav-actions,.site-header .userbar,.anixia-global-header .header-actions,.anixia-global-header .nav-actions,.anixia-global-header .userbar{margin-left:0!important;justify-content:flex-start!important}
        footer.anixia-global-footer,.anixia-footer-inner{ text-align:left!important }
        .anixia-footer-inner{margin:0 auto!important}
        .anixia-footer-main,.anixia-footer-nav,.anixia-footer-bottom{justify-content:flex-start!important;align-items:flex-start!important;text-align:left!important}
        header,.site-header,.anixia-global-header,.global-header,.main-header,.site-navbar{
          background:#111!important;background-color:#111!important;color:#fff!important;border:0!important;border-bottom:1px solid #292929!important;box-shadow:none!important;box-sizing:border-box;
        }
        .site-header,.anixia-global-header{position:sticky;top:0;z-index:9999;min-height:68px}
        .site-header .anixia-logo,.anixia-global-header .anixia-logo{
          display:inline-flex;align-items:center;flex:none;color:#03AF6A!important;text-decoration:none!important;
          font-family:Inter,"Segoe UI",Arial,sans-serif;font-size:27px;font-weight:850;letter-spacing:-1.9px;line-height:1;text-shadow:none;
        }
        .site-header .anixia-logo .anixia-logo-xia,.anixia-global-header .anixia-logo .anixia-logo-xia{
          display:inline;position:relative;margin:0;padding:0;color:#1DA1F2!important;background:transparent;border:0;border-radius:0;font:inherit;letter-spacing:inherit;line-height:inherit;text-shadow:none;transform:none;
        }
        .site-header .anixia-logo:hover,.anixia-global-header .anixia-logo:hover{opacity:.88}
        .site-header .anixia-logo:focus-visible,.anixia-global-header .anixia-logo:focus-visible{outline:2px solid #087a45;outline-offset:6px;border-radius:3px}
        @media(max-width:760px){
          .anixia-global-header-inner,.site-header .header-inner,.site-header .container,.site-header .container.nav,.anixia-global-header .header-inner,.anixia-global-header .container,.anixia-global-header .container.nav,.anixia-global-header .wrap{min-height:58px!important;padding:8px 14px!important;gap:10px!important;flex-wrap:wrap!important}
          .anixia-global-nav{flex-wrap:wrap!important;gap:4px!important}
          .anixia-global-nav a{padding:6px 7px!important}
          .site-header .anixia-logo,.anixia-global-header .anixia-logo{font-size:24px}
        }
        @media(prefers-reduced-motion:reduce){.site-header .anixia-logo,.anixia-global-header .anixia-logo{transition:none}}
      `;
      document.head.appendChild(style);
    }
  };

  const installFooter = () => {
    // Authentication pages keep a single brand mark in the shared header; no footer logo.
    if (document.querySelector("#login-form, #signup-form, #forgot-password-form") || /\/(login|signup|forgot-password)\.html$/.test(location.pathname)) return;
    const existing = document.querySelector("footer");
    const footer = existing || document.createElement("footer");
    footer.className = "anixia-global-footer";
    footer.innerHTML = `
      <div class="anixia-footer-inner">
        <div class="anixia-footer-main">
          <a class="anixia-footer-logo" href="/anixia/" aria-label="ANIXIA ホーム">ANI<span class="anixia-logo-xia">XIA</span></a>
          
        </div>
        <nav class="anixia-footer-nav" aria-label="フッターナビゲーション">
          <a href="/anixia/">ホーム</a>
          <a href="/anixia/anime.html">作品データベース</a>
          <a href="/anixia/entities.html">人物・団体</a>
          <a href="/anixia/season.html">今期アニメ</a>
          <a href="/anixia/ranking.html">ランキング</a>
          <a href="/anixia/recommendations.html">おすすめ診断</a>
          <a href="/anixia/community.html">コミュニティ</a>
          <a href="/anixia/data-sources.html">データ出典</a>
          <a href="/anixia/terms.html">利用規約</a>
          <a href="/anixia/privacy.html">プライバシー</a>
        </nav>
        <div class="anixia-footer-bottom"><span>© ANIXIA</span></div>
      </div>`;
    if (!existing) document.body.appendChild(footer);

    if (!document.getElementById("anixia-global-footer-style")) {
      const style = document.createElement("style");
      style.id = "anixia-global-footer-style";
      style.textContent = `
        footer.anixia-global-footer{
          display:block!important;position:relative!important;inset:auto!important;
          width:100%!important;margin:64px 0 0!important;padding:0!important;
          background:#111!important;color:#d6d6d6!important;border:0!important;border-top:1px solid #292929!important;box-shadow:none!important;
        }
        .anixia-footer-inner{width:min(1320px,100%);margin:0 auto;padding:38px 22px 20px}
        .anixia-footer-main{margin-bottom:24px}
        .anixia-footer-logo{display:inline-flex;color:#03af6a!important;text-decoration:none!important;font:850 27px/1 Inter,"Segoe UI",Arial,sans-serif;letter-spacing:-1.9px}
        .anixia-footer-logo .anixia-logo-xia{display:inline;position:relative;margin:0;padding:0;color:#1DA1F2!important;background:transparent;border:0;border-radius:0;font:inherit;letter-spacing:inherit;line-height:inherit;text-shadow:none;transform:none}
        .anixia-footer-description{margin:10px 0 0!important;color:#a8a8a8!important;font-size:12px!important}
        .anixia-footer-nav{display:flex;flex-wrap:wrap;gap:9px 22px;padding:20px 0;border:0}
        .anixia-footer-nav a{color:#e6e6e6!important;text-decoration:none!important;font-size:12px!important;font-weight:650!important;transition:color .15s ease}
        .anixia-footer-nav a:hover{color:#03af6a!important}
        .anixia-footer-bottom{display:flex;justify-content:space-between;gap:12px;padding-top:16px;color:#a8a8a8;font-size:10px;letter-spacing:.04em}
        @media(max-width:600px){.anixia-footer-inner{padding:30px 16px 18px}.anixia-footer-nav{gap:12px 16px}.anixia-footer-bottom{flex-direction:column;gap:5px}}
        @media(prefers-reduced-motion:reduce){.anixia-footer-nav a{transition:none}}
      `;
      document.head.appendChild(style);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once:true });
  } else {
    install();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installFooter, { once:true });
  else installFooter();
  const brandFix = document.createElement("style");
  brandFix.id = "anixia-brand-final-rules";
  brandFix.textContent = `
    .site-header .anixia-logo,.anixia-global-header .anixia-logo,.anixia-footer-logo{color:#03AF6A!important;text-decoration:none!important}
    .site-header .anixia-logo .anixia-logo-xia,.anixia-global-header .anixia-logo .anixia-logo-xia,.anixia-footer-logo .anixia-logo-xia{color:#1DA1F2!important}
    .site-header .anixia-logo .anixia-logo-xia::after,.anixia-global-header .anixia-logo .anixia-logo-xia::after,.anixia-footer-logo .anixia-logo-xia::after{content:none!important;display:none!important;background:none!important;border:0!important}
  `;
  document.head.appendChild(brandFix);
})();
