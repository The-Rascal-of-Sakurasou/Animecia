(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const en = () => window.ANIXIA_LANG?.() === "en";
  const hasJapanese = value => /[\\u3040-\\u30ff\\u3400-\\u9fff]/u.test(String(value||""));
  const title = a => en() ? (a.title_en || (a.title && !hasJapanese(a.title) ? a.title : "English title unavailable")) : (a.title_ja || a.title_kana || a.title || "タイトル未登録");
  const format = v => ({tv:"TV",movie:en()?"Movie":"劇場版",ova:"OVA",ona:"ONA",special:en()?"Special":"特別編",web:"Web"}[v] || v || "");
  async function works(id, sort) {
    try {
      const result = await ANIXIA.listAnime({sort, limit:5});
      $(id).innerHTML = result.data.length ? result.data.map(a =>
        `<a class="discover-card" href="anime-detail.html?id=${encodeURIComponent(a.id)}"><div class="anixia-poster anixia-list-poster">${ANIXIA.posterMarkup(a.poster_url,title(a),a.poster_credit)}</div><div><b>${esc(title(a))}</b><small>${esc([a.release_year,format(a.format)].filter(Boolean).join(" · "))}</small></div></a>`
      ).join("") : `<p class="discover-state">${en()?"Anime will appear here once catalog data is available.":"作品データが登録されると、ここに表示されます。"}</p>`;
    } catch (e) {
      console.error(e);
      $(id).innerHTML = `<p class="discover-state">${en()?"Could not load anime.":"作品を読み込めませんでした。"}</p>`;
    }
  }
  async function init() {
    try {
      const genres = await ANIXIA.getGenres();
      $("discover-genres").innerHTML = genres.length ? genres.map(g =>
        `<a class="discover-genre" href="anime.html?genre=${encodeURIComponent(g.id)}"><b>${esc(en() ? g.name : (g.name_ja || g.name))}</b></a>`
      ).join("") : `<p class="discover-state">${en()?"Genre data is being prepared.":"ジャンルデータを準備しています。"}</p>`;
    } catch (e) {
      console.error(e);
      $("discover-genres").innerHTML = `<p class="discover-state">${en()?"Could not load genres.":"ジャンルを読み込めませんでした。"}</p>`;
    }
    await Promise.all([works("discover-popular","popular"), works("discover-new","newest")]);
  }
  init();
})();