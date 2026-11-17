(() => {
  const HOME = "/anixia/";
  const LOGO_HTML = 'ANI<span>X</span>IA';

  const install = () => {
    let header = document.querySelector("header.site-header, .site-header");
    if (!header) {
      header = document.createElement("header");
      header.className = "site-header anixia-global-header";
      document.body.insertBefore(header, document.body.firstChild);
    }

    let logo = header.querySelector("a.anixia-logo, a.brand, a.logo");
    if (!logo) {
      logo = document.createElement("a");
      logo.className = "anixia-logo";
      const container = header.querySelector(".header-inner, .container.nav, .anixia-shell, .wrap, .container") || header;
      container.insertBefore(logo, container.firstChild);
    }

    logo.classList.add("anixia-logo");
    logo.href = HOME;
    logo.setAttribute("aria-label", "ANIXIA ホーム");
    logo.setAttribute("title", "ANIXIA ホーム");
    logo.innerHTML = LOGO_HTML;

    document.querySelectorAll(".auth-panel > a").forEach((link) => {
      if (link.textContent.trim().replace(/\\s+/g, "") === "ANIXIA") link.remove();
    });

    if (!document.getElementById("anixia-global-header-style")) {
      const style = document.createElement("style");
      style.id = "anixia-global-header-style";
      style.textContent = `
        header,.site-header,.anixia-global-header,.global-header,.main-header,.site-navbar{
          background:linear-gradient(105deg,#080B12 0%,#0D121C 58%,#111A27 100%)!important;
          background-color:#0B0F16!important;color:#F4F8FF!important;
          border-bottom:1px solid rgba(85,200,255,.18)!important;
          box-shadow:0 8px 28px rgba(0,0,0,.24)!important;box-sizing:border-box;
        }
        .site-header,.anixia-global-header{position:sticky;top:0;z-index:9999;min-height:68px;}
        .site-header .anixia-logo,.anixia-global-header .anixia-logo{
          display:inline-flex;align-items:center;flex:none;
          color:#F4F8FF!important;text-decoration:none!important;
          font-family:Inter,"Segoe UI",Arial,sans-serif;
          font-size:27px;font-weight:850;letter-spacing:-1.9px;line-height:1;
          text-shadow:0 1px 16px rgba(85,200,255,.08);
          transition:opacity .18s ease,transform .18s ease;
        }
        .site-header .anixia-logo span,.anixia-global-header .anixia-logo span{
          display:inline-block;color:#55C8FF!important;
          font-weight:950;
          text-shadow:0 0 12px rgba(85,200,255,.5),0 0 26px rgba(85,200,255,.2);
          transform:skewX(-8deg);
        }
        .site-header .anixia-logo:hover,.anixia-global-header .anixia-logo:hover{
          opacity:.88;transform:translateY(-1px);
        }
        .site-header .anixia-logo:focus-visible,.anixia-global-header .anixia-logo:focus-visible{
          outline:2px solid #8BDEFF;outline-offset:6px;border-radius:3px;
        }
        @media(max-width:650px){
          .site-header,.anixia-global-header{min-height:60px}
          .site-header .anixia-logo,.anixia-global-header .anixia-logo{font-size:24px}
        }
        @media(prefers-reduced-motion:reduce){
          .site-header .anixia-logo,.anixia-global-header .anixia-logo{transition:none}
        }
      `;
      document.head.appendChild(style);
    }
  };


  const installFooter = () => {
    const existing = document.querySelector("footer");
    const footer = existing || document.createElement("footer");
    footer.className = "anixia-global-footer";
    footer.innerHTML = `
      <div class="anixia-footer-inner">
        <div class="anixia-footer-main">
          <a class="anixia-footer-logo" href="/anixia/" aria-label="ANIXIA ホーム">ANI<span>X</span>IA</a>
          <p class="anixia-footer-description">アニメを探す、記録する、語り合う。</p>
        </div>
        <nav class="anixia-footer-nav" aria-label="フッターナビゲーション">
          <a href="/anixia/">ホーム</a>
          <a href="/anixia/anime.html">作品データベース</a>
          <a href="/anixia/season.html">今期アニメ</a>
          <a href="/anixia/ranking.html">ランキング</a>
          <a href="/anixia/recommendations.html">おすすめ診断</a>
          <a href="/anixia/community.html">コミュニティ</a>
          <a href="/anixia/reviews.html">レビュー</a>
          <a href="/anixia/data-sources.html">データ出典</a>
          <a href="/anixia/terms.html">利用規約</a>
          <a href="/anixia/privacy.html">プライバシー</a>
        </nav>
        <div class="anixia-footer-bottom"><span>© ANIXIA</span><span>Anime Database & Community</span></div>
      </div>`;
    if (!existing) document.body.appendChild(footer);

    if (!document.getElementById("anixia-global-footer-style")) {
      const style = document.createElement("style");
      style.id = "anixia-global-footer-style";
      style.textContent = `
        footer.anixia-global-footer{
          display:block!important;position:relative!important;inset:auto!important;
          width:100%!important;margin:64px 0 0!important;padding:0!important;
          background:linear-gradient(110deg,#080B12 0%,#0D121C 58%,#111A27 100%)!important;
          color:#D6DCE6!important;border:0!important;border-top:1px solid rgba(85,200,255,.22)!important;
          box-shadow:0 -12px 32px rgba(0,0,0,.08)!important;
        }
        .anixia-footer-inner{width:min(1320px,100%);margin:0 auto;padding:38px 22px 20px}
        .anixia-footer-main{margin-bottom:24px}
        .anixia-footer-logo{display:inline-flex;color:#F4F8FF!important;text-decoration:none!important;font:850 27px/1 Inter,"Segoe UI",Arial,sans-serif;letter-spacing:-1.9px}
        .anixia-footer-logo span{color:#55C8FF!important;font-weight:950;text-shadow:0 0 12px rgba(85,200,255,.42);transform:skewX(-8deg)}
        .anixia-footer-description{margin:10px 0 0!important;color:#8F9BAC!important;font-size:12px!important}
        .anixia-footer-nav{display:flex;flex-wrap:wrap;gap:9px 22px;padding:20px 0;border-top:1px solid rgba(255,255,255,.09);border-bottom:1px solid rgba(255,255,255,.09)}
        .anixia-footer-nav a{color:#B9C3D1!important;text-decoration:none!important;font-size:12px!important;font-weight:650!important;transition:color .15s ease}
        .anixia-footer-nav a:hover{color:#55C8FF!important}
        .anixia-footer-bottom{display:flex;justify-content:space-between;gap:12px;padding-top:16px;color:#748195;font-size:10px;letter-spacing:.04em}
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
})();