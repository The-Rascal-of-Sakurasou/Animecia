(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const message = text => {
    const el = $("message");
    if (el) el.textContent = text;
  };
  const allowedPages = new Set([
    "index.html", "mypage.html", "anime.html", "anime-detail.html",
    "ranking.html", "quiz.html", "recommendations.html", "discover.html",
    "season.html", "community.html", "profile.html"
  ]);

  function safeRedirect(value) {
    const fallback = new URL("mypage.html", location.href);
    if (!value) return fallback.href;
    try {
      const target = new URL(value, location.href);
      const page = target.pathname.split("/").filter(Boolean).pop() || "index.html";
      if (target.origin !== location.origin || !allowedPages.has(page)) return fallback.href;
      return target.href;
    } catch (_) {
      return fallback.href;
    }
  }

  function requestedRedirect() {
    return safeRedirect(new URLSearchParams(location.search).get("redirect"));
  }

  const login = $("login-form");
  if (login) login.addEventListener("submit", async event => {
    event.preventDefault();
    const button = $("submit");
    if (button.disabled) return;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    message("ログインしています…");
    try {
      const { data, error } = await ANIXIA.getClient().auth.signInWithPassword({
        email: $("email").value.trim(),
        password: $("password").value
      });
      if (error) throw error;
      if (!data.user || !data.session) throw new Error("ログインセッションを作成できませんでした。");
      location.replace(requestedRedirect());
    } catch (error) {
      console.error("ANIXIA sign-in failed", error);
      message("ログインできませんでした。メールアドレスとパスワードを確認してください。メール認証が未完了の場合は、確認メールもご確認ください。");
    } finally {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  });

  const signup = $("signup-form");
  if (signup) signup.addEventListener("submit", async event => {
    event.preventDefault();
    const button = $("submit");
    if (button.disabled) return;
    const email = $("email").value.trim();
    const password = $("password").value;
    if (password.length < 8) {
      message("パスワードは8文字以上にしてください。");
      $("password").focus();
      return;
    }
    if (password !== $("password-confirm").value) {
      message("パスワードが一致しません。");
      $("password-confirm").focus();
      return;
    }

    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    message("登録しています…");
    try {
      const callback = new URL("auth-callback.html", location.href);
      const target = new URL(requestedRedirect());
      callback.searchParams.set("redirect", target.pathname + target.search + target.hash);
      const { data, error } = await ANIXIA.getClient().auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callback.href }
      });
      if (error) throw error;
      if (data.session) {
        location.replace(requestedRedirect());
        return;
      }
      message("登録を受け付けました。確認メールのリンクを開くと登録が完了します。メールが届かない場合は、迷惑メールフォルダもご確認ください。");
      $("password").value = "";
      $("password-confirm").value = "";
    } catch (error) {
      console.error("ANIXIA sign-up failed", error);
      message("登録できませんでした。メールアドレス、パスワード、通信状態をご確認ください。");
    } finally {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  });
})();