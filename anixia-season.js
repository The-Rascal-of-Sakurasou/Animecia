(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const en=()=>localStorage.getItem("anixia-language")==="en";
  const names = { winter: en()?"Winter":"冬", spring: en()?"Spring":"春", summer: en()?"Summer":"夏", autumn: en()?"Autumn":"秋" };
  const seasonFromMonth = month => month <= 3 ? "winter" : month <= 6 ? "spring" : month <= 9 ? "summer" : "autumn";
  const tokyoNow = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(new Date());
    return {
      year: Number(parts.find(p => p.type === "year").value),
      month: Number(parts.find(p => p.type === "month").value),
      day: Number(parts.find(p => p.type === "day").value)
    };
  };
  const current = tokyoNow();
  let currentKey = current.year + "-" + seasonFromMonth(current.month);
  let lastRefreshDate = `${current.year}-${String(current.month).padStart(2, "0")}-${String(current.day).padStart(2, "0")}`;
  for (let y = current.year + 1; y >= 1960; y--) $("season-year").add(new Option(String(y), String(y)));
  $("season-year").value = String(current.year);
  $("season-name").value = seasonFromMonth(current.month);

  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  async function load() {
    const year = Number($("season-year").value);
    const season = $("season-name").value;
    $("season-title").textContent = en() ? names[season]+" "+year+" Anime" : year + "年 " + names[season] + "アニメ";
    $("season-grid").innerHTML = en() ? '<p class="season-state">Loading anime…</p>' : '<p class="season-state">作品情報を読み込んでいます…</p>';
    try {
      const works = [];
      let offset = 0;
      let total = 0;
      do {
        const page = await ANIXIA.listAnime({
          year, season, sort: "popular", limit: 50, offset
        });
        total = page.count;
        works.push(...page.data);
        offset += page.data.length;
        if (!page.data.length || offset >= total || offset >= 250) break;
      } while (true);

      $("season-grid").innerHTML = works.length
        ? works.map(a => `<a class="season-card" href="anime-detail.html?id=${encodeURIComponent(a.id)}"><div class="anixia-poster anixia-list-poster">${ANIXIA.posterMarkup(a.poster_url, (en() ? a.title : (a.title_ja || a.title_kana || a.title)) || "", a.poster_credit)}</div><div class="season-card-copy"><b>${esc((en() ? a.title : (a.title_ja || a.title_kana || a.title)) || (en() ? "Title unavailable" : "タイトル未登録"))}</b><small>${esc(a.format || (en() ? "Format unavailable" : "形式未登録"))}</small></div></a>`).join("")
        : (en() ? '<p class="season-state">No published anime are available for this season yet.</p>' : '<p class="season-state">このシーズンの公開作品データはまだありません。</p>');
    } catch (e) {
      console.error(e);
      $("season-grid").innerHTML = en() ? '<p class="season-state">Could not load anime.</p>' : '<p class="season-state">作品情報を取得できませんでした。</p>';
    }
  }

  $("season-year").addEventListener("change", load);
  $("season-name").addEventListener("change", load);
  load();

  // If the page remains open over a Japan-time season boundary, switch only
  // when the visitor was still viewing the previously-current season.
  setInterval(() => {
    const now = tokyoNow();
    const nextKey = now.year + "-" + seasonFromMonth(now.month);
    const dateKey = `${now.year}-${String(now.month).padStart(2, "0")}-${String(now.day).padStart(2, "0")}`;
    const selectedKey = $("season-year").value + "-" + $("season-name").value;
    if (nextKey !== currentKey) {
      const wasOnCurrent = selectedKey === currentKey;
      currentKey = nextKey;
      if (wasOnCurrent) {
        $("season-year").value = String(now.year);
        $("season-name").value = seasonFromMonth(now.month);
        load();
      }
    } else if (dateKey !== lastRefreshDate && selectedKey === currentKey) {
      load();
    }
    lastRefreshDate = dateKey;
  }, 5 * 60 * 1000);
})();