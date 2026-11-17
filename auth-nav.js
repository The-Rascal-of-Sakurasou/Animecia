/* ANIXIA: ログイン状態をホーム画面のアカウント導線へ反映 */
(function () {
  "use strict";
  function boot() {
    if (!window.ANIXIA || !ANIXIA.getClient) {
      window.setTimeout(boot, 50);
      return;
    }
    const client = ANIXIA.getClient();
    const links = Array.from(document.querySelectorAll("#account-link, #auth-link, #footer-login-link"));
    if (!links.length) return;

    function render(user) {
      const loggedIn = !!(user && !user.is_anonymous);
      links.forEach(link => {
        link.textContent = loggedIn ? "マイページ" : "ログイン";
        link.href = loggedIn ? "mypage.html" : "login.html";
        link.classList.toggle("primary", !loggedIn);
        link.setAttribute("aria-label", loggedIn ? "マイページ" : "ログイン");
      });
    }

    client.auth.getUser().then(({ data, error }) => {
      if (error) throw error;
      render(data.user || null);
    }).catch(error => {
      console.warn("ANIXIA auth navigation could not read the current user", error);
      render(null);
    });

    client.auth.onAuthStateChange((_event, session) => {
      render(session && session.user ? session.user : null);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();