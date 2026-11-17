(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const names={winter:"冬",spring:"春",summer:"夏",autumn:"秋"};
  const now=new Date(),month=now.getMonth()+1;
  const currentSeason=month<=3?"winter":month<=6?"spring":month<=9?"summer":"autumn";
  const currentYear=now.getFullYear();
  for(let y=currentYear+1;y>=1960;y--)$("season-year").add(new Option(String(y),String(y)));
  $("season-year").value=String(currentYear);
  $("season-name").value=currentSeason;
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  async function load(){
    const year=Number($("season-year").value),season=$("season-name").value;
    $("season-title").textContent=year+"年 "+names[season]+"アニメ";
    $("season-grid").innerHTML='<p class="season-state">作品情報を読み込んでいます…</p>';
    try{
      const result=await ANIXIA.listAnime({year,season,sort:"popular",limit:60});
      $("season-grid").innerHTML=result.data.length?result.data.map(a=>`<a class="season-card" href="anime-detail.html?id=${encodeURIComponent(a.id)}"><div class="anixia-poster anixia-list-poster">${ANIXIA.posterMarkup(a.poster_url,a.title_ja||a.title_kana||a.title||"")}</div><div class="season-card-copy"><b>${esc(a.title_ja||a.title_kana||a.title||"タイトル未登録")}</b><small>${esc(a.format||"形式未登録")}</small></div></a>`).join(""):'<p class="season-state">このシーズンの公開作品データはまだありません。</p>';
    }catch(e){console.error(e);$("season-grid").innerHTML='<p class="season-state">作品情報を取得できませんでした。</p>';}
  }
  $("season-year").addEventListener("change",load);$("season-name").addEventListener("change",load);load();
})();
