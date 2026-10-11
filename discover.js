let s;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const title=a=>AnimeciaData.title(a);
let rows=[],selectedGenres=new Set(),requestVersion=0,debounceTimer=null;

async function loadOptions(){
 const [genresResult,yearsResult]=await Promise.all([
  s.rpc("get_catalog_genre_counts"),
  s.rpc("get_catalog_years")
 ]);
 if(genresResult.error) throw genresResult.error;
 if(yearsResult.error) throw yearsResult.error;
 renderGenres(genresResult.data||[]);
 const years=(yearsResult.data||[]).map(x=>Number(x.year)).filter(y=>Number.isInteger(y));
 document.getElementById("year").innerHTML='<option value="">すべて</option>'+years.map(y=>'<option value="'+y+'">'+y+'</option>').join("");
}

function renderGenres(genres){
 const el=document.getElementById("genre-chips");
 el.innerHTML=genres.map(g=>'<button type="button" class="chip'+(selectedGenres.has(Number(g.id))?' active':'')+'" data-id="'+Number(g.id)+'">'+esc(g.name)+'<span class="genre-count">'+Number(g.anime_count||0).toLocaleString("ja-JP")+'</span></button>').join("")||'<span class="empty">ジャンルがありません。</span>';
 el.querySelectorAll(".chip").forEach(button=>button.addEventListener("click",()=>{
  const id=Number(button.dataset.id);
  if(selectedGenres.has(id))selectedGenres.delete(id);else selectedGenres.add(id);
  button.classList.toggle("active",selectedGenres.has(id));
  loadResults();
 }));
}

function rating(a){
 if(a?._animecia_rating!==null&&a?._animecia_rating!==undefined)return Number(a._animecia_rating);
 if(a?.average_score===null||a?.average_score===undefined||a?.average_score==="")return null;
 const n=Number(a.average_score);
 return Number.isFinite(n)?n/10:null;
}
function favoriteCount(a){return Number(a?._animecia_engagement?.favorite_count??a?.favourites_count??0);}

async function loadResults(){
 const version=++requestVersion;
 const q=document.getElementById("q").value.trim();
 const format=document.getElementById("format").value||null;
 const year=document.getElementById("year").value;
 const status=document.getElementById("status").value||null;
 const min=document.getElementById("rating").value;
 const sort=document.getElementById("sort").value||"title";
 const summary=[];
 if(q)summary.push("キーワード");
 if(selectedGenres.size)summary.push(selectedGenres.size+"ジャンル");
 if(format)summary.push(format);
 if(year)summary.push(year+"年");
 if(status)summary.push("放送状況");
 if(min)summary.push("評価"+min+"以上");
 document.getElementById("active-summary").textContent=summary.length?summary.join(" / "):"条件なし";
 document.getElementById("grid").innerHTML='<div class="loading">作品を検索しています…</div>';
 document.getElementById("count").textContent="";
 document.getElementById("result-count-v6").textContent="";
 const {data,error}=await s.rpc("search_anime_catalog_v3",{
  p_query:q||null,
  p_year:year?Number(year):null,
  p_season:null,
  p_status:status,
  p_format:format,
  p_genre_ids:[...selectedGenres],
  p_studio_id:null,
  p_min_rating:min?Number(min):null,
  p_sort:sort,
  p_limit:300,
  p_offset:0
 });
 if(version!==requestVersion)return;
 if(error){
  console.error("Discover catalog search failed:",error);
  document.getElementById("grid").innerHTML='<div class="error">作品データの検索に失敗しました。時間をおいて再読み込みしてください。</div>';
  return;
 }
 const catalogRows=data||[];
 const enriched=await AnimeciaData.withEngagement(s,catalogRows);
 if(version!==requestVersion)return;
 rows=enriched||[];
 const total=Number(catalogRows[0]?.total_count||0);
 const shown=rows.length;
 const countText=total.toLocaleString("ja-JP")+"件";
 document.getElementById("count").innerHTML='<b>'+countText+'</b>';
 document.getElementById("result-count-v6").innerHTML='<b>'+countText+'</b>'+(total>shown?'（表示 '+shown.toLocaleString("ja-JP")+'件）':"");
 document.getElementById("grid").innerHTML=rows.map(a=>'<a class="card" href="anime-detail.html?id='+encodeURIComponent(a.id)+'">'+(a.cover_image?'<img class="cover" src="'+esc(a.cover_image)+'" alt="'+esc(title(a))+'" loading="lazy" decoding="async">':'<div class="cover" style="display:grid;place-items:center">画像なし</div>')+'<div class="pad"><div class="title">'+esc(title(a))+'</div><div class="sub">'+esc(a.status||"")+(a.episodes!=null?" · "+a.episodes+"話":"")+'</div><div class="meta"><span class="pill">★ '+(rating(a)!==null?rating(a).toFixed(1):"—")+'</span><span>♥ '+favoriteCount(a).toLocaleString("ja-JP")+'</span></div></div></a>').join("")||'<div class="empty">条件に一致する作品がありません。</div>';
}

function scheduleSearch(){
 clearTimeout(debounceTimer);
 debounceTimer=setTimeout(loadResults,250);
}

async function load(){
 await AnimeciaAuth.init();
 s=AnimeciaAuth.client();
 const initialGenre=Number(new URLSearchParams(location.search).get("genre"));
 if(Number.isInteger(initialGenre)&&initialGenre>0)selectedGenres.add(initialGenre);
 await loadOptions();
 await loadResults();
}
["q"].forEach(id=>document.getElementById(id).addEventListener("input",scheduleSearch));
["format","year","status","rating","sort"].forEach(id=>document.getElementById(id).addEventListener("change",loadResults));
document.getElementById("q").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();loadResults();}});
document.getElementById("reset").onclick=()=>{
 document.getElementById("q").value="";
 document.getElementById("format").value="";
 document.getElementById("year").value="";
 document.getElementById("status").value="";
 document.getElementById("rating").value="";
 document.getElementById("sort").value="rating";
 selectedGenres.clear();
 document.querySelectorAll("#genre-chips .chip.active").forEach(x=>x.classList.remove("active"));
 loadResults();
};
load().catch(err=>{
 console.error("Animecia discover initialization failed:",err);
 document.getElementById("count").textContent="";
 document.getElementById("grid").innerHTML='<div class="error">作品データの読み込みに失敗しました。時間をおいて再読み込みしてください。</div>';
});
