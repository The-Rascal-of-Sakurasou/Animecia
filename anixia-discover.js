(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const title=a=>a.title_ja||a.title_kana||a.title||"タイトル未登録";
  async function works(id,sort){
    try{const result=await ANIXIA.listAnime({sort,limit:5});$(id).innerHTML=result.data.length?result.data.map(a=>`<a class="discover-card" href="anime-detail.html?id=${encodeURIComponent(a.id)}"><div class="anixia-poster anixia-list-poster">${ANIXIA.posterMarkup(a.poster_url,title(a),a.poster_credit)}</div><div><b>${esc(title(a))}</b><small>${esc([a.release_year,a.format].filter(Boolean).join(" · "))}</small></div></a>`).join(""):'<p class="discover-state">作品データが登録されると、ここに表示されます。</p>';}
    catch(e){console.error(e);$(id).innerHTML='<p class="discover-state">作品を読み込めませんでした。</p>';}
  }
  async function init(){
    try{const genres=await ANIXIA.getGenres();$("discover-genres").innerHTML=genres.length?genres.map(g=>`<a class="discover-genre" href="anime.html?genre=${encodeURIComponent(g.id)}"><b>${esc(g.name_ja||g.name)}</b><small>このジャンルの作品を見る</small></a>`).join(""):'<p class="discover-state">ジャンルデータを準備しています。</p>';}
    catch(e){console.error(e);$("discover-genres").innerHTML='<p class="discover-state">ジャンルを読み込めませんでした。</p>';}
    await Promise.all([works("discover-popular","popular"),works("discover-new","newest")]);
  }
  init();
})();
