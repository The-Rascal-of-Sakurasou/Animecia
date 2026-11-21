(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const en = () => localStorage.getItem("anixia-language") === "en";
  const seasonLabel = season => ({winter:en()?"Winter":"冬",spring:en()?"Spring":"春",summer:en()?"Summer":"夏",autumn:en()?"Autumn":"秋"}[season]);
  const hasJapanese = value => /[\u3040-\u30ff\u3400-\u9fff]/u.test(String(value || ""));
  const title = work => en() ? (work.title_en || (work.title && !hasJapanese(work.title) ? work.title : "English title unavailable")) : (work.title_ja || work.title_kana || work.title || "タイトル未登録");
  const seasonFromMonth = month => month <= 3 ? "winter" : month <= 6 ? "spring" : month <= 9 ? "summer" : "autumn";
  const tokyoNow = () => {
    const parts = new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
    return {year:Number(parts.find(p=>p.type==="year").value),month:Number(parts.find(p=>p.type==="month").value),day:Number(parts.find(p=>p.type==="day").value)};
  };
  const esc = value => String(value ?? "").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const now = tokyoNow();
  let currentKey = now.year+"-"+seasonFromMonth(now.month);
  let lastRefreshDate = [now.year,String(now.month).padStart(2,"0"),String(now.day).padStart(2,"0")].join("-");
  let offset=0,total=0,loading=false,requestToken=0;
  const pageSize=50;
  const formatLabel = value => ({tv:"TV",ova:"OVA",ona:"ONA",web:"Web",movie:en()?"Movie":"劇場版",special:en()?"Special":"特別編"}[String(value||"").toLowerCase()] || value || (en()?"Format unavailable":"形式未登録"));
  for(let year=now.year+1;year>=1960;year--) $("season-year").add(new Option(String(year),String(year)));
  $("season-year").value=String(now.year);
  $("season-name").value=seasonFromMonth(now.month);

  function updateCount(shown){$("season-count").textContent=total?(en()?shown.toLocaleString("en-US")+" / "+total.toLocaleString("en-US")+" titles":shown.toLocaleString("ja-JP")+" / "+total.toLocaleString("ja-JP")+"作品"):"";}
  function setState(message){$("season-grid").innerHTML='<p class="season-state">'+esc(message)+'</p>';$("season-more").hidden=true;$("season-count").textContent="";}
  function render(works,append){
    const seasonal=works.filter(work=>["tv","ona","web"].includes(String(work.format||"").toLowerCase()));
    const cards=seasonal.map(work=>'<a class="season-card" href="anime-detail.html?id='+encodeURIComponent(work.id)+'"><div class="anixia-poster anixia-list-poster">'+ANIXIA.posterMarkup(work.poster_url,title(work),work.poster_credit)+'</div><div class="season-card-copy"><b>'+esc(title(work))+'</b><small>'+esc(formatLabel(work.format))+'</small></div></a>').join("");
    if(append){const state=$("season-grid").querySelector(".season-state");if(state)state.remove();$("season-grid").insertAdjacentHTML("beforeend",cards);}
    else $("season-grid").innerHTML=cards||'<p class="season-state">'+(en()?"No TV or streaming titles with verified season data are registered for this season yet.":"このシーズンの放送・配信作品はまだ登録されていません。クール情報が確認できた作品のみ表示します。")+'</p>';
  }
  async function load(reset=true){
    if(reset){loading=false;offset=0;total=0;requestToken++;$("season-grid").innerHTML="";$("season-more").hidden=true;}
    else if(loading)return;
    const token=requestToken,year=Number($("season-year").value),season=$("season-name").value;
    $("season-title").textContent=en()?seasonLabel(season)+" "+year+" Anime":year+"年 "+seasonLabel(season)+"アニメ";
    if(reset)setState(en()?"Loading anime…":"作品情報を読み込んでいます…");
    loading=true;$("season-more").disabled=true;$("season-more").textContent=en()?"Loading…":"読み込み中…";
    try{
      // listAnime defaults to newest; deliberately do not request popularity sorting.
      const page=await ANIXIA.listAnime({year,season,limit:pageSize,offset});
      if(token!==requestToken)return;
      total=Number(page.count||0);
      render(page.data||[],!reset);
      offset+=(page.data||[]).length;
      const shown=$("season-grid").querySelectorAll(".season-card").length;
      updateCount(shown);
      $("season-more").hidden=!(offset<total&&(page.data||[]).length>0);
    }catch(error){
      console.error(error);
      if(token!==requestToken)return;
      if(reset)setState(en()?"Could not load anime. Please retry.":"作品情報を取得できませんでした。再試行してください。");
      $("season-more").hidden=false;
      $("season-more").dataset.retry="true";
    }finally{
      if(token===requestToken){loading=false;$("season-more").disabled=false;$("season-more").textContent=en()?"Load more":"さらに読み込む";}
    }
  }
  $("season-year").addEventListener("change",()=>load(true));
  $("season-name").addEventListener("change",()=>load(true));
  $("season-more").addEventListener("click",()=>{delete $("season-more").dataset.retry;load(false);});
  load(true);
  setInterval(()=>{
    const current=tokyoNow(),nextKey=current.year+"-"+seasonFromMonth(current.month);
    const dateKey=[current.year,String(current.month).padStart(2,"0"),String(current.day).padStart(2,"0")].join("-");
    const selectedKey=$("season-year").value+"-"+$("season-name").value;
    if(nextKey!==currentKey){const wasCurrent=selectedKey===currentKey;currentKey=nextKey;if(wasCurrent){$("season-year").value=String(current.year);$("season-name").value=seasonFromMonth(current.month);load(true);}}
    else if(dateKey!==lastRefreshDate&&selectedKey===currentKey)load(true);
    lastRefreshDate=dateKey;
  },5*60*1000);
})();