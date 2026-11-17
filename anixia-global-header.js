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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once:true });
  } else {
    install();
  }
})();