(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
  const genreName = genre => genre.name_ja || genre.name || "名称未設定";
  let genres = [];

  function render() {
    const query = $("q").value.trim().toLocaleLowerCase("ja");
    const filtered = genres.filter(genre =>
      genreName(genre).toLocaleLowerCase("ja").includes(query)
    );
    $("count").textContent = filtered.length + "ジャンル";

    if (!genres.length) {
      $("grid").innerHTML = '<div class="empty">ジャンル情報は準備中です。作品データの登録後に表示します。</div>';
      return;
    }

    $("grid").innerHTML = filtered.map(genre =>
      '<a class="genre" href="anime.html?genre=' + encodeURIComponent(genre.id) + '">' +
        '<div class="genre-name">' + esc(genreName(genre)) + '</div>' +
        '<div class="genre-count">このジャンルの作品を見る</div>' +
      '</a>'
    ).join("") || '<div class="empty">該当するジャンルがありません。</div>';
  }

  async function load() {
    try {
      genres = await ANIXIA.getGenres();
      render();
    } catch (error) {
      console.error("ANIXIA genre page failed to load:", error);
      $("grid").innerHTML = '<div class="empty">ジャンルを読み込めませんでした。時間をおいて再読み込みしてください。</div>';
      $("count").textContent = "";
    }
  }

  $("q").addEventListener("input", render);
  load();
})();
