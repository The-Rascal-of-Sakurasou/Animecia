(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const en=()=>localStorage.getItem("anixia-language")==="en";
  const hasJapanese=v=>/[\u3040-\u30ff\u3400-\u9fff]/u.test(String(v||""));
  const name=a=>en()?(a.title_en||(a.title&&!hasJapanese(a.title)?a.title:"English title unavailable")):(a.title_ja||a.title_kana||a.title||"タイトル未登録");
  async function init(){
    const year=$("year");for(let y=new Date().getFullYear();y>=1960;y--)year.add(new Option(String(y),String(y)));
    try{
      const genres=await ANIXIA.getGenres();
      $("genre-options").innerHTML=genres.length?genres.map(g=>`<label class="diag-genre"><input type="checkbox" name="genre" value="${g.id}"><span>${esc(en()?(g.name&&!hasJapanese(g.name)?g.name:"Genre name unavailable"):(g.name_ja||g.name))}</span></label>`).join(""):'<p class="diag-state">ジャンルデータを準備しています。</p>';
    }catch(e){console.error(e);$("genre-options").innerHTML='<p class="diag-state">ジャンルを読み込めませんでした。</p>';}
  }
  $("diagnosis-form").addEventListener("submit",async e=>{
    e.preventDefault();
    const checked=[...document.querySelectorAll('input[name="genre"]:checked')];
    if(checked.length>3){checked.slice(3).forEach(x=>x.checked=false);}
    const genreIds=[...document.querySelectorAll('input[name="genre"]:checked')].map(x=>x.value);
    const options={genreIds,format:$("format").value,year:$("year").value,season:$("season").value};
    $("diagnosis-results").innerHTML='<p class="diag-state">条件に合う作品を探しています…</p>';
    $("diagnosis-summary").textContent="診断中…";
    try{
      const results=await ANIXIA.diagnoseAnime(options);
      $("diagnosis-results").innerHTML=results.length?results.map(a=>`<a class="diag-card" href="anime-detail.html?id=${encodeURIComponent(a.id)}"><div class="anixia-poster anixia-list-poster">${ANIXIA.posterMarkup(a.poster_url,name(a))}</div><div class="diag-card-copy"><b>${esc(name(a))}</b><small>ジャンル一致 ${a.match_count}件 · ${esc(a.release_year||"年未登録")}</small></div></a>`).join(""):'<p class="diag-state">条件に合う公開作品がありません。条件を広げるか、作品データの登録後にお試しください。</p>';
      $("diagnosis-summary").textContent=results.length?`条件に合う作品を${results.length}件表示しています。一致ジャンル数と登録済みの人気指標をもとに並べています。`:"診断結果はありません。";
    }catch(error){console.error(error);$("diagnosis-results").innerHTML='<p class="diag-state">診断に失敗しました。時間をおいて再度お試しください。</p>';$("diagnosis-summary").textContent="データベースに接続できませんでした。";}
  });
  document.addEventListener("change",e=>{
    if(e.target.matches('input[name="genre"]')){
      const checked=[...document.querySelectorAll('input[name="genre"]:checked')];
      if(checked.length>3){e.target.checked=false;$("diagnosis-summary").textContent="ジャンルは最大3つまで選択できます。";}
    }
  });
  init();
})();
