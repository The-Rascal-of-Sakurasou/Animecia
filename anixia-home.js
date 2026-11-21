(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const language = () => window.ANIXIA_LANG?.() || "ja";
  const messages = {
    ja: {loading:"読み込み中…", empty:"作品データはまだありません。", failed:"作品情報を読み込めませんでした。時間をおいて再度お試しください。", retry:"再試行", year:"放送年未登録", genresEmpty:"ジャンルデータはまだありません。", genresFailed:"ジャンル情報を読み込めませんでした。", login:"ログイン", mypage:"マイページ"},
    en: {loading:"Loading…", empty:"No titles are available yet.", failed:"Could not load titles. Please try again later.", retry:"Retry", year:"Year unknown", genresEmpty:"No genres are available yet.", genresFailed:"Could not load genres.", login:"Log in", mypage:"My Library"}
  };
  const t = () => messages[language()] || messages.ja;
  const hasJapanese = value => /[\u3040-\u30ff\u3400-\u9fff]/u.test(String(value||""));
  const title = (work) => language() === "en" ? (work.title_en || work.title_romaji || (work.title && !hasJapanese(work.title) ? work.title : "English title unavailable")) : (work.title_ja || work.title_kana || work.title || "タイトル未設定");
  const year = (work) => work.release_year ? String(work.release_year) : t().year;
  const card = (work) => `
    <a class="anixia-work-card" href="anime-detail.html?id=${encodeURIComponent(work.id)}">
      <div class="anixia-poster">
        ${ANIXIA.posterMarkup(work.poster_url, title(work), work.poster_credit)}
      </div>
      <div class="anixia-work-copy">
        <strong>${esc(title(work))}</strong>
        <small>${esc([year(work), work.format || ""].filter(Boolean).join(" · "))}</small>
      </div>
    </a>`;
  const showRetryState = (id, message, retry) => {
    const el = $(id);
    if (!el) return;
    el.innerHTML = `<div class="anixia-state"><p>${esc(message)}</p><button type="button" class="anixia-retry-button">${esc(t().retry)}</button></div>`;
    el.querySelector(".anixia-retry-button")?.addEventListener("click", retry, { once: true });
  };
  async function loadSection(id, options) {
    try {
      const result = await ANIXIA.listAnime(options);
      const el = $(id);
      if (!el) return;
      el.innerHTML = result.data.length ? result.data.map(card).join("") : `<p class="anixia-state">${esc(t().empty)}</p>`;
    } catch (error) {
      console.error(error);
      showRetryState(id, t().failed, () => loadSection(id, options));
    }
  }
  async function loadGenres() {
    try {
      const genres = await ANIXIA.getGenres();
      $("genre-links").innerHTML = genres.length
        ? genres.slice(0, 12).map(g => `<a href="anime.html?genre=${encodeURIComponent(g.id)}">${esc(language() === "en" ? (g.name_en || (g.name && !hasJapanese(g.name) ? g.name : "Genre name unavailable")) : (g.name_ja || g.name))}</a>`).join("")
        : `<p class="anixia-state">${esc(t().genresEmpty)}</p>`;
    } catch (error) {
      console.error(error);
      showRetryState("genre-links", t().genresFailed, loadGenres);
    }
  }
  async function init() {
    try {
      const count = await ANIXIA.getCatalogCount();
      $("catalog-count").textContent = count.toLocaleString(language() === "ja" ? "ja-JP" : "en-US");
    } catch (error) {
      console.error(error);
      $("catalog-count").textContent = "—";
    }
    await Promise.all([
      loadSection("popular-works", { sort: "newest", limit: 5 }),
    ]);
    await loadGenres();
    try {
      const user = await ANIXIA.getUser();
      $("account-link").textContent = user ? t().mypage : t().login;
      $("account-link").href = user ? "mypage.html" : "login.html";
    } catch (_) {}
  }
  $("hero-search").addEventListener("submit", (event) => {
    event.preventDefault();
    const query = $("search-input").value.trim();
    location.href = "anime.html" + (query ? "?search=" + encodeURIComponent(query) : "");
  });
  window.addEventListener("anixia:languagechange", () => {
    if (window.ANIXIA_RELOAD_HOME) init();
  });
  init();
})();
