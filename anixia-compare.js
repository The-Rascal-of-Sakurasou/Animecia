(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let hits=[];
  const name=a=>a.title_ja||a.title_kana||a.title||"タイトル未登録";
  async function search(e){
    e.preventDefault();
    const query=$("compare-query").value.trim();if(!query)return;
    $("compare-hits").innerHTML='<p class="compare-state">検索しています…</p>';
    try{
      const result=await ANIXIA.listAnime({query,limit:20});
      hits=result.data;
      $("compare-hits").innerHTML=hits.length?hits.map(a=>`<div class="compare-hit"><img src="${a.poster_url?esc(a.poster_url):""}" alt=""><label><input type="checkbox" value="${a.id}"><span>${esc(name(a))}<small>${esc([a.release_year,a.format].filter(Boolean).join(" · "))}</small></span></label></div>`).join(""):'<p class="compare-state">該当する作品はありません。</p>';
      document.querySelectorAll('#compare-hits input[type="checkbox"]').forEach(x=>x.addEventListener("change",()=>{
        const selected=[...document.querySelectorAll('#compare-hits input:checked')];
        if(selected.length>3){x.checked=false;return;}
        $("compare-submit").disabled=selected.length<2;
      }));
    }catch(error){console.error(error);$("compare-hits").innerHTML='<p class="compare-state">検索に失敗しました。</p>';}
  }
  $("compare-search").addEventListener("submit",search);
  $("compare-submit").addEventListener("click",async()=>{
    const ids=[...document.querySelectorAll('#compare-hits input:checked')].map(x=>x.value);
    if(ids.length<2||ids.length>3)return;
    $("compare-output").innerHTML='<p class="compare-state">比較データを読み込んでいます…</p>';
    try{
      const works=await Promise.all(ids.map(id=>ANIXIA.getAnime(id)));
      const rows=[
        ["タイトル",a=>name(a)],
        ["形式",a=>a.format||"未登録"],
        ["放送年",a=>a.release_year||"未登録"],
        ["クール",a=>a.season||"未登録"],
        ["話数",a=>a.episode_count||"未登録"],
        ["制作会社",a=>a.studio?(a.studio.name_ja||a.studio.name):"未登録"],
        ["ジャンル",a=>a.genres.map(g=>g.name_ja||g.name).join("、")||"未登録"],
        ["視聴者数",a=>a.watchers_count??0],
        ["レビュー数",a=>a.reviews_count??0],
        ["あらすじ",a=>a.synopsis||"未登録"]
      ];
      $("compare-output").innerHTML='<div class="compare-table-wrap"><table class="compare-table"><thead><tr><th>比較項目</th>'+works.map(a=>'<th>'+esc(name(a))+'</th>').join("")+'</tr></thead><tbody>'+rows.map(([label,get])=>'<tr><th>'+esc(label)+'</th>'+works.map(a=>'<td>'+esc(get(a))+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>';
    }catch(error){console.error(error);$("compare-output").innerHTML='<p class="compare-state">比較データを取得できませんでした。</p>';}
  });
})();
