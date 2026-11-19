(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const PAGE_SIZE = 24;
  const state = { kind: "people", page: 0, count: 0, query: "" };
  const config = {
    people: { title: "人物・声優・スタッフ", table: "people", fields: "id,name,name_ja,name_kana,name_en,nickname,person_type", order: "name_ja", detail: "person" },
    characters: { title: "キャラクター", table: "characters", fields: "id,name,name_ja,name_kana,name_en,nickname", order: "name_ja", detail: "character" },
    studios: { title: "制作会社", table: "studios", fields: "id,name,name_ja,name_kana,name_en,website_url", order: "name_ja", detail: "studio" }
  };
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const en=()=>localStorage.getItem("anixia-language")==="en";
  const label = row => en()?(row.name_en||row.name||"Name unavailable"):(row.name_ja||"日本語表記未登録");
  const initials = row => Array.from(label(row).trim())[0] || "A";
  const kindLabel = value => en()?({voice_actor:"Voice Actor",director:"Director",screenwriter:"Screenwriter",producer:"Producer",composer:"Composer"}[value]||"Person / Staff"):({voice_actor:"声優",director:"監督",screenwriter:"脚本",producer:"プロデューサー",composer:"作曲家"}[value]||"人物・スタッフ");
  function card(row) {
    const c = config[state.kind];
    const subtitle = state.kind === "people" ? kindLabel(row.person_type) : state.kind === "characters" ? (en()?"Character":"キャラクター") : (en()?"Animation Studio":"アニメ制作会社");
    return '<a class="entity-card" href="entity-detail.html?type='+c.detail+'&id='+encodeURIComponent(row.id)+'"><span class="entity-avatar" aria-hidden="true">'+esc(initials(row))+'</span><span class="entity-card-copy"><b>'+esc(label(row))+'</b><small>'+esc(subtitle)+'</small></span></a>';
  }
  async function load() {
    const c = config[state.kind];
    $("entity-results").innerHTML = '<p class="entity-empty">'+(en()?"Searching…":"検索しています…")+'</p>';
    $("entity-heading").textContent = en()?({people:"People, Voice Actors & Staff",characters:"Characters",studios:"Studios"}[state.kind]||c.title):c.title;
    const db = ANIXIA.getClient();
    let query = db.from(c.table).select(c.fields, {count:"exact"});
    if (state.query) {
      const term = state.query.replace(/[%,()]/g, " ").replace(/\s+/g, " ").trim().slice(0,70);
      if (term) {
        const pattern = "%"+term+"%";
        const fields = state.kind === "people" ? ["name_ja","name","name_kana","name_en","nickname"] : state.kind === "characters" ? ["name_ja","name","name_kana","name_en","nickname"] : ["name_ja","name","name_kana","name_en"];
        query = query.or(fields.map(field => field+".ilike."+pattern).join(","));
      }
    }
    const start = state.page * PAGE_SIZE;
    const result = await query.order(en()?"name_en":c.order,{ascending:true,nullsFirst:false}).order("name",{ascending:true,nullsFirst:false}).range(start,start+PAGE_SIZE-1);
    if (result.error) throw result.error;
    state.count = result.count || 0;
    $("entity-results").innerHTML = result.data?.length ? result.data.map(card).join("") : '<p class="entity-empty">'+(en()?"No matching entries. Try another name.":"該当するデータはありません。別の名前で検索してください。")+'</p>';
    $("entity-count").textContent = state.count.toLocaleString(en()?"en-US":"ja-JP")+(en()?" results":"件");
    $("entity-page").textContent = en()?"Page "+(state.page+1):(state.page+1)+"ページ目";
    $("entity-prev").disabled = state.page === 0;
    $("entity-next").disabled = (state.page+1)*PAGE_SIZE >= state.count;
  }
  function fail(error) {
    console.error("ANIXIA entity search failed",error);
    $("entity-results").innerHTML = '<p class="entity-empty">'+(en()?"Could not load data. Please reload later.":"データを読み込めませんでした。時間をおいて再読み込みしてください。")+'</p>';
    $("entity-count").textContent = "";
    $("entity-prev").disabled = true;
    $("entity-next").disabled = true;
  }
  document.querySelectorAll("[data-kind]").forEach(button => button.addEventListener("click",() => {
    state.kind = button.dataset.kind; state.page = 0;
    document.querySelectorAll("[data-kind]").forEach(item => item.setAttribute("aria-selected",String(item===button)));
    const placeholders = en()?{people:"Search people, voice actors or staff…",characters:"Search characters or aliases…",studios:"Search studios…"}:{people:"人物名・読み仮名・英語名で検索…",characters:"キャラクター名・ニックネームで検索…",studios:"制作会社名・英語名で検索…"};
    $("entity-query").placeholder = placeholders[state.kind];
    load().catch(fail);
  }));
  $("entity-search").addEventListener("submit",event => {event.preventDefault();state.query=$("entity-query").value.trim();state.page=0;load().catch(fail);});
  $("entity-prev").addEventListener("click",()=>{if(state.page>0){state.page--;load().catch(fail);}});
  $("entity-next").addEventListener("click",()=>{if((state.page+1)*PAGE_SIZE<state.count){state.page++;load().catch(fail);}});
  const params = new URLSearchParams(location.search);
  if (config[params.get("kind")]) {
    state.kind = params.get("kind");
    document.querySelectorAll("[data-kind]").forEach(button=>button.setAttribute("aria-selected",String(button.dataset.kind===state.kind)));
  }
  if (params.get("q")) { state.query=params.get("q").slice(0,70); $("entity-query").value=state.query; }
  load().catch(fail);
})();