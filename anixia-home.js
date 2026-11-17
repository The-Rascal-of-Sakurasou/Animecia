(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const title = (work) => work.title_ja || work.title_kana || work.title || "タイトル未設定";
  const year = (work) => work.release_year ? String(work.release_year) : "放送年未登録";
  const card = (work) => `
    <a class="anixia-work-card" href="anime-detail.html?id=${encodeURIComponent(work.id)}">
      <div class="anixia-poster">
        ${work.poster_url ? `<img src="${esc(work.poster_url)}" alt="" loading="lazy" decoding="async">` : '<span>ANIXIA</span>'}
      </div>
      <div class="anixia-work-copy">
        <strong>${esc(title(work))}</strong>
        <small>${esc([year(work), work.format || ""].filter(Boolean).join(" · "))}</small>
      </div>
    </a>`;
  const showState = (id, message) => { const el = $(id); if (el) el.innerHTML = `<p class="anixia-state">${esc(message)}</p>`; };

  async function loadSection(id, options) {
    try {
      const result = await ANIXIA.listAnime(options);
      const el = $(id);
      if (!el) return;
      el.innerHTML = result.data.length ? result.data.map(card).join("") : '<p class="anixia-state">作品データを準備しています。</p>';
    } catch (error) {
      console.error(error);
      showState(id, "作品情報を読み込めませんでした。時間をおいて再度お試しください。");
    }
  }

  async function init() {
    try {
      const count = await ANIXIA.getCatalogCount();
      $("catalog-count").textContent = count.toLocaleString("ja-JP");
    } catch (error) {
      console.error(error);
      $("catalog-count").textContent = "—";
    }
    await Promise.all([
      loadSection("popular-works", { sort: "popular", limit: 5 }),
      loadSection("new-works", { sort: "newest", limit: 5 })
    ]);
    try {
      const genres = await ANIXIA.getGenres();
      $("genre-links").innerHTML = genres.length
        ? genres.slice(0, 12).map(g => `<a href="anime.html?genre=${encodeURIComponent(g.id)}">${esc(g.name_ja || g.name)}</a>`).join("")
        : '<p class="anixia-state">ジャンルデータを準備しています。</p>';
    } catch (error) {
      console.error(error);
      showState("genre-links", "ジャンル情報を読み込めませんでした。");
    }
    try {
      const user = await ANIXIA.getUser();
      $("account-link").textContent = user ? "マイページ" : "ログイン";
      $("account-link").href = user ? "mypage.html" : "login.html";
    } catch (_) {}
  }

  $("hero-search").addEventListener("submit", (event) => {
    event.preventDefault();
    const query = $("search-input").value.trim();
    location.href = "anime.html" + (query ? "?search=" + encodeURIComponent(query) : "");
  });
  init();
})();
