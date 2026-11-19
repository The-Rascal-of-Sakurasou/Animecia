(() => {
  "use strict";
  const el=document.getElementById("rank-list"),note=document.getElementById("rank-note");
  let metric="rating";
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const en=()=>localStorage.getItem("anixia-language")==="en";
  const hasJapanese=v=>/[\\u3040-\\u30ff\\u3400-\\u9fff]/u.test(String(v||""));
  const name=a=>en()?(a.title_en||(a.title&&!hasJapanese(a.title)?a.title:"English title unavailable")):(a.title_ja||a.title_kana||a.title||"タイトル未登録");
  const fmt=v=>({tv:"TV",movie:en()?"Movie":"劇場版",ova:"OVA",ona:"ONA",special:en()?"Special":"特別編",web:"Web",other:en()?"Other":"その他"}[v]||v||(en()?"Format unavailable":"形式未登録"));
  async function load(){
    el.innerHTML='<p class="rank-state">ランキングを更新しています…</p>';
    note.textContent=metric==="rating"?"評価5件以上の作品を対象に、平均点の高い順で表示します。":metric==="popular"?"登録された視聴者数の多い順です。":metric==="reviews"?"登録されたレビュー数の多い順です。":"放送年の新しい順です。";
    try{
      const rows=await ANIXIA.getRankings(metric,50);
      el.innerHTML=rows.length?rows.map((a,i)=>{
        const score=metric==="rating"?Number(a.average_score).toFixed(2)+" / 10 · "+a.rating_count+(en()?" ratings":"件"):metric==="popular"?(a.watchers_count||0).toLocaleString(en()?"en-US":"ja-JP")+(en()?" members":"人"):metric==="reviews"?(a.reviews_count||0).toLocaleString(en()?"en-US":"ja-JP")+(en()?" reviews":"件"):a.release_year||(en()?"Year unavailable":"年未登録");
        return `<a class="rank-row" href="anime-detail.html?id=${encodeURIComponent(a.id)}"><span class="rank-no">${i+1}</span><div class="anixia-poster anixia-rank-poster">${ANIXIA.posterMarkup(a.poster_url,name,a.poster_credit)}</div><span><span class="rank-title">${esc(name(a))}</span><span class="rank-meta">${esc([a.release_year,fmt(a.format)].filter(Boolean).join(" · "))}</span></span><span class="rank-score">${esc(score)}</span></a>`;
      }).join(""):'<p class="rank-state">'+(metric==="rating"?"平均評価は5件以上の評価が集まった作品から表示します。": "ランキング対象の作品データがまだ登録されていません。")+'</p>';
    }catch(e){console.error(e);el.innerHTML='<p class="rank-state">ランキングを取得できませんでした。時間をおいて再度お試しください。</p>';}
    document.querySelectorAll("[data-metric]").forEach(b=>b.classList.toggle("active",b.dataset.metric===metric));
  }
  document.querySelectorAll("[data-metric]").forEach(b=>b.addEventListener("click",()=>{metric=b.dataset.metric;load();}));
  load();
})();
