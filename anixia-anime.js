(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const PAGE_SIZE = 25;
  let page = 0;
  let lastCount = 0;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const displayTitle = a => a.title_ja || a.title_kana || a.title || "タイトル未設定";
  const formatName = value => ({tv:"TV",movie:"劇場版",ova:"OVA",ona:"ONA",special:"特別編",web:"Web",other:"その他"}[value] || value || "形式未登録");

  function renderCard(a) {
    const meta = [a.release_year || "年未登録", formatName(a.format), a.season || ""].filter(Boolean).join(" · ");
    return `<a class="anixia-result-card" href="anime-detail.html?id=${encodeURIComponent(a.id)}">
      <div class="anixia-result-poster">${ANIXIA.posterMarkup(a.poster_url, displayTitle(a), a.poster_credit)}</div>
      <div class="anixia-result-copy"><b>${esc(displayTitle(a))}</b><small>${esc(meta)}</small></div>
    </a>`;
  }

  async function populateFilters() {
    const params = new URLSearchParams(location.search);
    $("query").value = params.get("search") || "";
    $("genre").value = params.get("genre") || "";
    $("year").value = params.get("year") || "";
    $("season").value = params.get("season") || "";
    $("format").value = params.get("format") || "";
    $("studio").value = params.get("studio") || "";
    $("person").value = params.get("person") || "";
    $("character").value = params.get("character") || "";
    $("sort").value = params.get("sort") || "newest";

    const years = $("year");
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= 1960; y--) years.add(new Option(String(y), String(y)));

    try {
      const genres = await ANIXIA.getGenres();
      genres.forEach(g => $("genre").add(new Option(g.name_ja || g.name, g.id)));
    } catch (e) { console.warn("genre options unavailable", e); }

    try {
      const studios = await ANIXIA.getStudios();
      studios.forEach(s => $("studio").add(new Option(s.name_ja || s.name, s.id)));
    } catch (e) { console.warn("studio options unavailable", e); }

    try {
      const tags = await ANIXIA.getTags();
      tags.forEach(t => $("tag").add(new Option(t.name_ja || t.name, t.id)));
      const selected = new Set([
        ...params.getAll("tag"),
        ...(params.get("tags") || "").split(",").filter(Boolean)
      ]);
      Array.from($("tag").options).forEach(option => { option.selected = selected.has(option.value); });
    } catch (e) { console.warn("tag options unavailable", e); }
  }

  async function search() {
    const query = $("query").value.trim();
    const options = {
      query,
      genreId: $("genre").value,
      year: $("year").value,
      season: $("season").value,
      format: $("format").value,
      studioId: $("studio").value,
      tagIds: Array.from($("tag").selectedOptions).map(option => option.value),
      personQuery: $("person").value.trim(),
      characterQuery: $("character").value.trim(),
      sort: $("sort").value,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE
    };
    $("results").innerHTML = '<p class="anixia-state">検索しています…</p>';
    $("result-summary").textContent = "検索中…";
    try {
      const result = await ANIXIA.listAnime(options);
      lastCount = result.count || 0;
      $("results").innerHTML = result.data.length
        ? result.data.map(renderCard).join("")
        : '<p class="anixia-state">条件に一致する作品はありません。別の条件で検索してください。</p>';
      $("result-count").textContent = lastCount ? `${lastCount.toLocaleString("ja-JP")}件` : `${result.data.length}件`;
      $("result-summary").textContent = result.data.length ? "検索結果を表示しています。" : "作品データが登録されると、ここに表示されます。";
      $("prev").disabled = page === 0;
      $("next").disabled = (page + 1) * PAGE_SIZE >= lastCount;
      $("page-label").textContent = `${page + 1}ページ目`;
      const params = new URLSearchParams();
      if (query) params.set("search", query);
      if (options.genreId) params.set("genre", options.genreId);
      if (options.year) params.set("year", options.year);
      if (options.season) params.set("season", options.season);
      if (options.format) params.set("format", options.format);
      if (options.studioId) params.set("studio", options.studioId);
      options.tagIds.forEach(id => params.append("tag", id));
      if (options.personQuery) params.set("person", options.personQuery);
      if (options.characterQuery) params.set("character", options.characterQuery);
      if (options.sort !== "newest") params.set("sort", options.sort);
      history.replaceState(null, "", location.pathname + (params.size ? "?" + params.toString() : ""));
    } catch (error) {
      console.error(error);
      $("results").innerHTML = '<p class="anixia-state">検索に失敗しました。通信状態を確認して、もう一度お試しください。</p>';
      $("result-count").textContent = "";
      $("result-summary").textContent = "データベースに接続できませんでした。";
      $("prev").disabled = true;
      $("next").disabled = true;
    }
  }

  $("filter-form").addEventListener("submit", event => { event.preventDefault(); page = 0; search(); });
  $("reset").addEventListener("click", () => {
    $("filter-form").reset();
    $("tag").selectedIndex = -1;
    page = 0;
    search();
  });
  $("prev").addEventListener("click", () => { if (page > 0) { page--; search(); window.scrollTo({top:0,behavior:"smooth"}); } });
  $("next").addEventListener("click", () => { page++; search(); window.scrollTo({top:0,behavior:"smooth"}); });
  populateFilters().then(search);
})();
