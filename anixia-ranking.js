(() => {
  "use strict";
  const el=document.getElementById("rank-list"),note=document.getElementById("rank-note");
  let metric="rating",loading=false,requestId=0;
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const en=()=>localStorage.getItem("anixia-language")==="en";
  const hasJapanese=v=>/[\u3040-\u30ff\u3400-\u9fff]/u.test(String(v||""));
  const name=a=>en()?(a.title_en||(a.title&&!hasJapanese(a.title)?a.title:"English title unavailable")):(a.title_ja||a.title_kana||a.title||"タイトル未登録");
  const fmt=v=>({tv:"TV",movie:en()?"Movie":"劇場版",ova:"OVA",ona:"ONA",special:en()?"Special":"特別編",web:"Web",other:en()?"Other":"その他"}[v]||v||(en()?"Format unavailable":"形式未登録"));
  const labels=()=>({
    rating:en()?"Titles with at least five user ratings, ordered by average score.":"ANIXIA内の評価が5件以上ある作品を、平均点の高い順に表示します。",
    newest:en()?"Titles ordered by release year, newest first.":"放送年・公開年の新しい作品から表示します。"
  });
  async function load(){
    const id=++requestId;
    loading=true;
    el.innerHTML='<p class="rank-state">'+(en()?"Loading titles…":"作品情報を読み込んでいます…")+'</p>';
    note.textContent=labels()[metric];
    document.querySelectorAll("[data-metric]").forEach(b=>{
      const active=b.dataset.metric===metric;
      b.classList.toggle("active",active);
      b.setAttribute("aria-pressed",String(active));
    });
    try{
      // Ratings are aggregated from ANIXIA's own ratings table. No external popularity metric is requested.
      const rows=await ANIXIA.getRankings(metric,50);
      if(id!==requestId)return;
      el.innerHTML=rows.length?rows.map((a,i)=>{
        const score=metric==="rating"
          ? Number(a.average_score||0).toFixed(2)+" / 10 · "+Number(a.rating_count||0).toLocaleString(en()?"en-US":"ja-JP")+(en()?" ratings":"件の評価")
          : (a.release_year|| (en()?"Year unavailable":"年未登録"));
        return '<a class="rank-row" href="anime-detail.html?id='+encodeURIComponent(a.id)+'"><span class="rank-no">'+(i+1)+'</span><div class="anixia-poster anixia-rank-poster">'+ANIXIA.posterMarkup(a.poster_url,name(a),a.poster_credit)+'</div><span class="rank-copy"><span class="rank-title">'+esc(name(a))+'</span><span class="rank-meta">'+esc([a.release_year,fmt(a.format)].filter(Boolean).join(" · "))+'</span></span><span class="rank-score">'+esc(score)+'</span></a>';
      }).join(""):'<p class="rank-state">'+(en()?(metric==="rating"?"No titles have at least five user ratings yet.":"No titles are registered yet."):(metric==="rating"?"平均評価は5件以上の評価が集まった作品から表示します。":"ランキング対象の作品がまだ登録されていません。"))+'</p>';
    }catch(error){
      console.error(error);
      if(id!==requestId)return;
      el.innerHTML='<div class="rank-state">'+(en()?"Could not load titles. Please try again.":"作品情報を取得できませんでした。時間をおいて再度お試しください。")+'<p><button type="button" class="rank-retry" id="rank-retry">'+(en()?"Retry":"再試行")+'</button></p></div>';
      document.getElementById("rank-retry")?.addEventListener("click",load,{once:true});
    }finally{if(id===requestId)loading=false;}
  }
  document.querySelectorAll("[data-metric]").forEach(button=>button.addEventListener("click",()=>{
    if(loading||button.dataset.metric===metric)return;
    metric=button.dataset.metric;load();
  }));
  load();
})();