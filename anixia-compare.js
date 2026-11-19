(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let hits=[];
  const en=()=>localStorage.getItem("anixia-language")==="en";
  const hasJapanese=v=>/[\\u3040-\\u30ff\\u3400-\\u9fff]/u.test(String(v||""));
  const name=a=>en()?(a.title_en||(a.title&&!hasJapanese(a.title)?a.title:"English title unavailable")):(a.title_ja||a.title_kana||a.title||"タイトル未登録");
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
        [en()?"Title":"タイトル",a=>name(a)],
        [en()?"Format":"形式",a=>a.format||(en()?"Not available":"未登録")],
        [en()?"Year":"放送年",a=>a.release_year||(en()?"Not available":"未登録")],
        [en()?"Season":"クール",a=>a.season||(en()?"Not available":"未登録")],
        [en()?"Episodes":"話数",a=>a.episode_count||(en()?"Not available":"未登録")],
        [en()?"Studio":"制作会社",a=>a.studio?(en()?a.studio.name:(a.studio.name_ja||a.studio.name)):(en()?"Not available":"未登録")],
        [en()?"Genres":"ジャンル",a=>a.genres.map(g=>en()?g.name:(g.name_ja||g.name)).join(en()?", ":"、")||(en()?"Not available":"未登録")],
        [en()?"Members":"視聴者数",a=>a.watchers_count??0],
        [en()?"Reviews":"レビュー数",a=>a.reviews_count??0],
        [en()?"Synopsis":"あらすじ",a=>en()?(a.synopsis_en||"English synopsis unavailable"):(a.synopsis||"未登録")]
      ];
      $("compare-output").innerHTML='<div class="compare-table-wrap"><table class="compare-table"><thead><tr><th>'+(en()?"Field":"比較項目")+'</th>'+works.map(a=>'<th>'+esc(name(a))+'</th>').join("")+'</tr></thead><tbody>'+rows.map(([label,get])=>'<tr><th>'+esc(label)+'</th>'+works.map(a=>'<td>'+esc(get(a))+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>';
    }catch(error){console.error(error);$("compare-output").innerHTML='<p class="compare-state">比較データを取得できませんでした。</p>';}
  });
})();
