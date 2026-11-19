/* ANIXIA: ホームヘッダーのログイン・マイページ・ログアウト */
(function () {
  "use strict";
  function boot() {
    if (!window.ANIXIA || !ANIXIA.getClient) {
      window.setTimeout(boot, 50);
      return;
    }
    const client = ANIXIA.getClient();
    const loginLink = document.getElementById("account-link");
    const mypageLink = document.getElementById("mypage-link");
    const logoutButton = document.getElementById("home-logout");
    const legacyLinks = Array.from(document.querySelectorAll("#auth-link, #footer-login-link"));

    function render(user) {
      const loggedIn = !!(user && !user.is_anonymous && (user.email_confirmed_at || user.confirmed_at));
      if (loginLink) loginLink.hidden = loggedIn;
      if (mypageLink) mypageLink.hidden = !loggedIn;
      if (logoutButton) logoutButton.hidden = !loggedIn;
      legacyLinks.forEach(link => {
        link.textContent = loggedIn ? "マイページ" : "ログイン";
        link.href = loggedIn ? "mypage.html" : "login.html";
        link.setAttribute("aria-label", loggedIn ? "マイページ" : "ログイン");
      });
    }

    if (logoutButton) {
      logoutButton.addEventListener("click", async () => {
        logoutButton.disabled = true;
        logoutButton.textContent = "ログアウト中…";
        try {
          const { error } = await client.auth.signOut();
          if (error) throw error;
          window.location.href = "index.html";
        } catch (error) {
          console.error("ANIXIA logout failed", error);
          logoutButton.disabled = false;
          logoutButton.textContent = "ログアウト";
          window.alert("ログアウトできませんでした。時間をおいて再度お試しください。");
        }
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
