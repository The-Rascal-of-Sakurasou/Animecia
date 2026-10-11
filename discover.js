let s;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const title=a=>AnimeciaData.title(a);
let rows=[],genreMap=new Map(),selectedGenres=new Set();
async function fetchCatalogRows(){
 let all=[];
 for(let offset=0;;offset+=1000){
  const {data,error}=await s.rpc("search_anime_catalog_v2",{
   p_query:null,p_genre_id:null,p_studio_id:null,p_year:null,p_season:null,
   p_status:null,p_format:null,p_sort:"title",p_limit:1000,p_offset:offset
  });
  if(error) throw error;
  const batch=data||[];
  all.push(...batch);
  if(batch.length<1000) break;
 }
 return all;
}
async function load(){
 await AnimeciaAuth.init();
 s=AnimeciaAuth.client();
 const [catalogResult,genreResult]=await Promise.allSettled([fetchCatalogRows(),s.rpc("get_catalog_genres")]);
 if(catalogResult.status!=="fulfilled") throw catalogResult.reason;
 const catalogRows=catalogResult.value||[];
 const gr=genreResult.status==="fulfilled"?genreResult.value:{data:[],error:genreResult.reason};
 const ar=await AnimeciaData.withEngagement(s,catalogRows);
 if(gr.error) console.warn("Genre metadata unavailable; catalog will still be displayed.",gr.error);
 (gr.data||[]).forEach(g=>genreMap.set(Number(g.id),g.name));
 const normGenre=v=>String(v??"").normalize("NFKC").trim().toLowerCase();
 rows=(ar||[]).map(a=>{
   const names=String(a.genre||"").split(",").map(normGenre).filter(Boolean);
   const g=[...genreMap.entries()].filter(([,name])=>names.includes(normGenre(name))).map(([id])=>id);
   return {...a,e:{
     average_rating:a._animecia_rating,
     favorite_count:a._animecia_engagement?.favorite_count||0,
     review_count:a._animecia_engagement?.review_count||0
   },g};
 });
 const years=[...new Set(rows.map(a=>Number(a.season_year)).filter(y=>Number.isInteger(y)&&y>=1900&&y<=new Date().getFullYear()+1))].sort((a,b)=>b-a);
 document.getElementById("year").innerHTML='<option value="">すべて</option>'+years.map(y=>'<option>'+y+'</option>').join("");
 const initialGenre=new URLSearchParams(location.search).get("genre");if(initialGenre){selectedGenres.add(Number(initialGenre));}renderGenres(gr.data||[]);render();
}
function renderGenres(gs){
 const counts=new Map(); rows.forEach(a=>a.g.forEach(id=>counts.set(id,(counts.get(id)||0)+1))); document.getElementById("genre-chips").innerHTML=gs.map(g=>'<button type="button" class="chip" data-id="'+g.id+'">'+esc(g.name)+'<span class="genre-count">'+(counts.get(Number(g.id))||0)+'</span></button>').join("")||'<span class="empty">ジャンルがありません。</span>';
 document.querySelectorAll("#genre-chips .chip").forEach(b=>{if(selectedGenres.has(Number(b.dataset.id)))b.classList.add("active");b.onclick=()=>{const id=Number(b.dataset.id);selectedGenres.has(id)?selectedGenres.delete(id):selectedGenres.add(id);b.classList.toggle("active",selectedGenres.has(id));render()};});
}
function render(){
 let r=[...rows],q=document.getElementById("q").value.trim().toLowerCase(),f=document.getElementById("format").value,y=document.getElementById("year").value,st=document.getElementById("status").value,min=document.getElementById("rating").value,sort=document.getElementById("sort").value;
 if(q)r=r.filter(a=>(title(a)+" "+(a.title||"")).toLowerCase().includes(q));
 if(f){const target=f.toUpperCase();r=r.filter(a=>String(a.format||"").toUpperCase()===target || (target==="MOVIE"&&String(a.format||"").toUpperCase()==="FILM"));}if(y)r=r.filter(a=>String(a.season_year)===y);if(st)r=r.filter(a=>a.status===st);if(min)r=r.filter(a=>Number(a.e.average_rating||0)>=Number(min));
 if(selectedGenres.size)r=r.filter(a=>[...selectedGenres].every(g=>a.g.includes(g)));
if(sort==="new")r.sort((a,b)=>String(b.start_date||"").localeCompare(String(a.start_date||"")));
else if(sort==="popular")r.sort((a,b)=>Number(b.e.favorite_count||0)-Number(a.e.favorite_count||0));
else if(sort!=="title")r.sort((a,b)=>Number(b.e.average_rating||0)-Number(a.e.average_rating||0));
 document.getElementById("count").innerHTML='<b>'+r.length+'</b> 作品';document.getElementById("result-count-v6").innerHTML='<b>'+r.length+'</b> 作品';
 const summary=[];if(q)summary.push("キーワード");if(selectedGenres.size)summary.push(selectedGenres.size+"ジャンル");if(f)summary.push(f);if(y)summary.push(y+"年");if(st)summary.push("放送状況");if(min)summary.push("評価"+min+"以上");document.getElementById("active-summary").textContent=summary.length?summary.join(" / "):"条件なし";
 document.getElementById("grid").innerHTML=r.slice(0,300).map(a=>'<a class="card" href="anime-detail.html?id='+a.id+'">'+(a.cover_image?'<img class="cover" src="'+esc(a.cover_image)+'" alt="'+esc(title(a))+'" loading="lazy" decoding="async">':'<div class="cover" style="display:grid;place-items:center">画像なし</div>')+'<div class="pad"><div class="title">'+esc(title(a))+'</div><div class="sub">'+esc(a.status||"")+(a.episodes!=null?" · "+a.episodes+"話":"")+'</div><div class="meta"><span class="pill">★ '+(a.e.average_rating!=null?Number(a.e.average_rating).toFixed(1):"—")+'</span><span>♥ '+Number(a.e.favorite_count||0)+'</span></div></div></a>').join("")||'<div class="empty">条件に一致する作品がありません。</div>';
}
["q","format","year","status","rating","sort"].forEach(id=>document.getElementById(id).addEventListener("input",render));
document.getElementById("q").addEventListener("keydown",e=>{if(e.key==="Enter")e.preventDefault();});
document.getElementById("reset").onclick=()=>{document.getElementById("q").value="";document.getElementById("format").value="";document.getElementById("year").value="";document.getElementById("status").value="";document.getElementById("rating").value="";document.getElementById("sort").value="rating";selectedGenres.clear();document.querySelectorAll(".chip.active").forEach(x=>x.classList.remove("active"));render()};
load().catch(err=>{console.error(err);document.getElementById("count").textContent="";document.getElementById("grid").innerHTML="<div class=\"error\">作品データの読み込みに失敗しました。時間をおいて再読み込みしてください。</div>";});
