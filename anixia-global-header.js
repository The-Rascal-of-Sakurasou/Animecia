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

    // 認証画面にあった本文内の旧ロゴは、共通ヘッダーに一本化する
    document.querySelectorAll(".auth-panel > a").forEach((link) => {
      if (link.textContent.trim().replace(/\s+/g, "") === "ANIXIA") link.remove();
    });

    if (!document.getElementById("anixia-global-header-style")) {
      const style = document.createElement("style");
      style.id = "anixia-global-header-style";
      style.textContent = `
        .anixia-global-header{position:sticky;top:0;z-index:9999;min-height:64px;display:flex;align-items:center;padding:0 max(18px,calc((100% - 1240px)/2));background:rgba(20,42,67,.98);border-bottom:1px solid rgba(255,255,255,.1);box-sizing:border-box}
        .anixia-global-header .anixia-logo,.site-header .anixia-logo{display:inline-flex;align-items:center;flex:none;color:#fff!important;text-decoration:none!important;font-family:Arial,sans-serif;font-size:25px;font-weight:950;letter-spacing:-1.8px;line-height:1}
        .anixia-global-header .anixia-logo span,.site-header .anixia-logo span{color:#55b5f2}
        .anixia-global-header .anixia-logo:focus-visible,.site-header .anixia-logo:focus-visible{outline:2px solid #9ed0f5;outline-offset:5px;border-radius:2px}
        @media(max-width:650px){.anixia-global-header{min-height:58px;padding:0 14px}.anixia-global-header .anixia-logo,.site-header .anixia-logo{font-size:23px}}
      `;
      document.head.appendChild(style);
    }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, {once:true});
  else install();
})();