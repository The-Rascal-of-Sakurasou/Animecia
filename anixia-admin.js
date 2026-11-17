(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  async function loadPendingReviews(){
    const el=$("pending-reviews");
    el.innerHTML='<p class="admin-message">審査待ちレビューを読み込んでいます…</p>';
    try{
      const rows=await ANIXIA.listPendingReviews();
      el.innerHTML=rows.length?rows.map(r=>`
        <article style="padding:14px;border:1px solid #30435f;border-radius:10px;margin:10px 0;background:#0b1423">
          <strong style="color:#fff;font-size:13px">${esc(r.title)}</strong>
          <p style="color:#f2b84d;font-size:10px">${esc(r.anime.title_ja||r.anime.title||"作品未登録")}${r.spoiler?" · ネタバレあり":""}</p>
          <p style="color:#b8c5d7;font-size:12px;line-height:1.8;white-space:pre-wrap">${esc(r.body)}</p>
          <button type="button" class="admin-button" data-publish-review="${esc(r.id)}">公開を承認</button>
        </article>`).join(""):'<p class="admin-message">審査待ちレビューはありません。</p>';
      el.querySelectorAll("[data-publish-review]").forEach(button=>button.addEventListener("click",async()=>{
        button.disabled=true;
        try{await ANIXIA.moderateReview(button.dataset.publishReview,true);await loadPendingReviews();}
        catch(e){console.error(e);button.disabled=false;alert("レビューを公開できませんでした。");}
      }));
    }catch(e){console.error(e);el.innerHTML='<p class="admin-message">レビュー一覧を読み込めませんでした。</p>';}
  }
  async function loadPendingAnime(){
    const el=$("pending-anime");
    el.innerHTML='<p class="admin-message">未公開候補を読み込んでいます…</p>';
    try{
      const rows=await ANIXIA.listPendingAnime(50);
      el.innerHTML=rows.length?rows.map(a=>{
        const title=a.title_ja||a.title_kana||a.title||"タイトル未設定";
        const meta=[a.format,a.release_year,a.season_name_text||a.season_name].filter(Boolean).join(" · ");
        const official=a.official_url||a.official_site_url;
        const links=[
          official?'<a href="'+esc(official)+'" target="_blank" rel="noopener noreferrer">公式サイト</a>':"",
          a.wikipedia_url?'<a href="'+esc(a.wikipedia_url)+'" target="_blank" rel="noopener noreferrer">参考情報</a>':""
        ].filter(Boolean).join(" / ");
        return `
          <article style="padding:14px;border:1px solid #30435f;border-radius:10px;margin:10px 0;background:#0b1423">
            <strong style="color:#fff;font-size:14px">${esc(title)}</strong>
            <p style="color:#aebbd0;font-size:11px">${esc(meta||"作品形式・放送時期は未登録")} · 出典: ${esc(a.source||"未登録")} · ID: ${esc(a.source_id||"未登録")}</p>
            <p style="font-size:12px">${links||'<span class="admin-message">確認用リンクなし</span>'}</p>
            <p style="color:#d8c39d;font-size:11px">非公開候補 — 対象作品・公開可能な情報か確認してください。</p>
            <button type="button" class="admin-button" data-publish-anime="${esc(a.id)}">確認して公開</button>
          </article>`;
      }).join(""):'<p class="admin-message">未公開候補はありません。</p>';
      el.querySelectorAll("[data-publish-anime]").forEach(button=>button.addEventListener("click",async()=>{
        if(!window.confirm("日本のアニメ作品であること、対象形式であること、成人向けではないこと、表示情報の根拠を確認しましたか？\n確認できた場合のみ公開します。"))return;
        button.disabled=true;
        try{
          await ANIXIA.setAnimePublished(button.dataset.publishAnime,true);
          await loadPendingAnime();
        }catch(e){
          console.error(e);
          button.disabled=false;
          alert("作品を公開できませんでした。管理者権限とデータを確認してください。");
        }
      }));
    }catch(e){
      console.error(e);
      el.innerHTML='<p class="admin-message">作品候補を読み込めませんでした。管理者権限と接続状態を確認してください。</p>';
    }
  }

  async function loadPendingEpisodes(){
    const el=$("pending-episodes");
    el.innerHTML='<p class="admin-message">審査待ちエピソードを読み込んでいます…</p>';
    try{
      const rows=await ANIXIA.listPendingEpisodes(100);
      el.innerHTML=rows.length?rows.map(ep=>{
        const work=Array.isArray(ep.anime)?ep.anime[0]:ep.anime;
        const workTitle=work?(work.title_ja||work.title||"作品名未登録"):"作品未登録";
        const number=ep.episode_number||ep.episode_order||"番号未登録";
        const title=ep.title_ja||ep.title||"サブタイトル未登録";
        const meta=[ep.aired_at,ep.episode_kind,ep.source].filter(Boolean).join(" · ");
        return '<article style="padding:14px;border:1px solid #30435f;border-radius:10px;margin:10px 0;background:#0b1423">'+
          '<strong style="color:#fff;font-size:13px">'+esc(workTitle)+'</strong>'+
          '<p style="color:#f2b84d;font-size:11px;margin:6px 0">第'+esc(number)+'話 · '+esc(title)+'</p>'+
          '<p style="color:#aebbd0;font-size:10px">'+esc(meta||"補足情報なし")+'</p>'+
          (ep.synopsis?'<p style="color:#b8c5d7;font-size:11px;line-height:1.7">'+esc(ep.synopsis)+'</p>':'<p class="admin-message">あらすじ未登録</p>')+
          '<button type="button" class="admin-button" data-publish-episode="'+esc(ep.id)+'">確認して公開</button>'+
          '</article>';
      }).join(""):'<p class="admin-message">審査待ちエピソードはありません。</p>';
      el.querySelectorAll("[data-publish-episode]").forEach(button=>{
        button.addEventListener("click",async()=>{
          if(!window.confirm("作品との対応・話数・タイトル・公開可能な情報であることを確認しましたか？"))return;
          button.disabled=true;
          try{
            await ANIXIA.setEpisodePublished(button.dataset.publishEpisode,true);
            await loadPendingEpisodes();
          }catch(e){
            console.error(e);button.disabled=false;
            alert("エピソードを公開できませんでした。");
          }
        });
      });
    }catch(e){
      console.error(e);
      el.innerHTML='<p class="admin-message">エピソード候補を読み込めませんでした。管理者権限と接続状態を確認してください。</p>';
    }
  }

  let adminAnimeRows=[];
  let adminTaxonomy={genres:[],tags:[]};

  const relationLabels={
    sequel:"続編",prequel:"前編",side_story:"外伝",spin_off:"スピンオフ",
    alternative_version:"別バージョン・リメイク",summary:"総集編",
    parent_story:"本編・親作品",adaptation:"メディア化・原作関係",other:"その他"
  };
  function selectedValues(select){
    return [...select.selectedOptions].map(option=>option.value).filter(Boolean);
  }
  function fillTaxonomySelect(id,items,selected=[]){
    const el=$(id);
    const keep=new Set(selected);
    el.innerHTML=items.map(item=>{
      const label=item.name_ja||item.name||"名称未登録";
      return '<option value="'+esc(item.id)+'"'+(keep.has(item.id)?" selected":"")+'>'+esc(label)+'</option>';
    }).join("");
  }
  function animeLabel(anime){
    return (anime.title_ja||anime.title_kana||anime.title||"タイトル未設定")+
      (anime.is_published?"（公開）":"（未公開）");
  }
  async function loadAdminMetadata(){
    const status=$("taxonomy-message");
    status.textContent="作品・ジャンル・タグを読み込んでいます…";
    try{
      const [animeRows,taxonomy]=await Promise.all([
        ANIXIA.getAdminAnimeOptions(500),
        ANIXIA.getAdminTaxonomy()
      ]);
      adminAnimeRows=animeRows;
      adminTaxonomy=taxonomy;
      const options=animeRows.map(a=>'<option value="'+esc(a.id)+'">'+esc(animeLabel(a))+'</option>').join("");
      $("metadata-anime").innerHTML='<option value="">作品を選択してください</option>'+options;
      $("related-anime").innerHTML='<option value="">作品を選択してください</option>'+options;
      fillTaxonomySelect("metadata-genres",taxonomy.genres);
      fillTaxonomySelect("metadata-tags",taxonomy.tags);
      status.textContent="作品 "+animeRows.length+"件、ジャンル "+taxonomy.genres.length+"件、タグ "+taxonomy.tags.length+"件を読み込みました。";
      await renderCatalogQuality(animeRows);
      const requested=new URLSearchParams(location.search).get("anime");
      if(requested&&animeRows.some(a=>a.id===requested)){
        $("metadata-anime").value=requested;
        await loadSelectedAnimeMetadata();
      }
    }catch(e){
      console.error(e);
      status.textContent="管理用データを読み込めませんでした。権限とデータベース接続を確認してください。";
      $("catalog-quality-check").innerHTML='<p class="admin-message">品質チェックを実行できませんでした。</p>';
    }
  }

  async function renderCatalogQuality(rows){
    const pending=rows.filter(a=>!a.is_published);
    if(!pending.length){
      $("catalog-quality-check").innerHTML='<p class="admin-message">未公開候補はありません。</p>';
      return;
    }
    const ids=pending.map(a=>a.id);
    const db=ANIXIA.getClient();
    const genreResult=await db.from("anime_genres").select("anime_id").in("anime_id",ids);
    if(genreResult.error)throw genreResult.error;
    const hasGenre=new Set((genreResult.data||[]).map(x=>x.anime_id));
    const issues=pending.map(a=>{
      const missing=[];
      if(!(a.title_ja||a.title_kana||a.title))missing.push("作品名");
      if(!a.format)missing.push("形式");
      if(!a.release_year)missing.push("放送年");
      if(!(a.synopsis||"").trim())missing.push("あらすじ");
      if(!(a.official_url||a.official_site_url))missing.push("公式サイトURL");
      if(!hasGenre.has(a.id))missing.push("ジャンル");
      return {anime:a,missing};
    }).filter(x=>x.missing.length);
    $("catalog-quality-check").innerHTML=issues.length?issues.slice(0,80).map(x=>{
      const title=x.anime.title_ja||x.anime.title_kana||x.anime.title||"タイトル未設定";
      return '<article style="padding:11px;border:1px solid #30435f;border-radius:9px;margin:8px 0;background:#0b1423">'+
        '<strong style="color:#fff;font-size:12px">'+esc(title)+'</strong>'+
        '<p style="color:#d8c39d;font-size:11px;margin:6px 0">不足項目：'+esc(x.missing.join("・"))+'</p>'+
        '<button type="button" class="admin-button" data-edit-quality="'+esc(x.anime.id)+'">この作品を編集</button>'+
        '</article>';
    }).join(""):'<p class="admin-message">基本項目の不足は検出されませんでした。</p>';
    $("catalog-quality-check").querySelectorAll("[data-edit-quality]").forEach(button=>{
      button.addEventListener("click",async()=>{
        $("metadata-anime").value=button.dataset.editQuality;
        await loadSelectedAnimeMetadata();
        $("metadata-anime").scrollIntoView({behavior:"smooth",block:"center"});
      });
    });
  }

  async function loadSelectedAnimeMetadata(){
    const animeId=$("metadata-anime").value;
    if(!animeId){
      fillTaxonomySelect("metadata-genres",adminTaxonomy.genres);
      fillTaxonomySelect("metadata-tags",adminTaxonomy.tags);
      $("anime-relations-list").innerHTML='<p class="admin-message">作品を選択してください。</p>';
      return;
    }
    $("taxonomy-message").textContent="選択した作品の情報を読み込んでいます…";
    try{
      const data=await ANIXIA.getAdminAnimeTaxonomy(animeId);
      fillTaxonomySelect("metadata-genres",adminTaxonomy.genres,data.genreIds);
      fillTaxonomySelect("metadata-tags",adminTaxonomy.tags,data.tagIds);
      renderRelations(animeId,data.relations);
      $("taxonomy-message").textContent="作品情報を読み込みました。";
    }catch(e){
      console.error(e);
      $("taxonomy-message").textContent="作品のメタデータを読み込めませんでした。";
    }
  }

  function renderRelations(animeId,relations){
    const byId=new Map(adminAnimeRows.map(a=>[a.id,a]));
    const list=$("anime-relations-list");
    if(!relations.length){
      list.innerHTML='<p class="admin-message">関連作品はまだ登録されていません。</p>';
      return;
    }
    list.innerHTML=relations.map(r=>{
      const related=byId.get(r.related_anime_id);
      return '<article style="padding:11px;border:1px solid #30435f;border-radius:9px;margin:8px 0;background:#0b1423">'+
        '<strong style="color:#fff;font-size:12px">'+esc(related?animeLabel(related):"作品ID: "+r.related_anime_id)+'</strong>'+
        '<p style="color:#aebbd0;font-size:11px;margin:6px 0">関係：'+esc(relationLabels[r.relation_type]||r.relation_type)+'</p>'+
        '<button type="button" class="admin-button" data-remove-relation="'+esc(r.related_anime_id)+'" data-relation-type="'+esc(r.relation_type)+'">関連付けを解除</button>'+
        '</article>';
    }).join("");
    list.querySelectorAll("[data-remove-relation]").forEach(button=>{
      button.addEventListener("click",async()=>{
        button.disabled=true;
        try{
          await ANIXIA.removeAdminAnimeRelation(animeId,button.dataset.removeRelation,button.dataset.relationType);
          await loadSelectedAnimeMetadata();
          $("relation-message").textContent="関連付けを解除しました。";
        }catch(e){
          console.error(e);button.disabled=false;
          $("relation-message").textContent="関連付けを解除できませんでした。";
        }
      });
    });
  }

  async function createTaxonomy(kind){
    const input=$(kind==="genre"?"new-genre":"new-tag");
    const button=$(kind==="genre"?"create-genre":"create-tag");
    button.disabled=true;
    try{
      const item=await ANIXIA.createAdminTaxonomyItem(kind,input.value);
      input.value="";
      const selected=$("metadata-anime").value;
      await loadAdminMetadata();
      if(selected)$("metadata-anime").value=selected;
      await loadSelectedAnimeMetadata();
      const target=$(kind==="genre"?"metadata-genres":"metadata-tags");
      const option=[...target.options].find(o=>o.value===item.id);
      if(option)option.selected=true;
      $("taxonomy-message").textContent=(kind==="genre"?"ジャンル":"タグ")+"を追加しました。作品に割り当てるには保存してください。";
    }catch(e){
      console.error(e);
      $("taxonomy-message").textContent="追加できませんでした。既存項目との重複がないか確認してください。";
    }finally{button.disabled=false;}
  }

  async function init(){
    try{
      const user=await ANIXIA.getUser();
      if(!user){$("admin-status").textContent="ログインが必要です。";return;}
      $("user-id").textContent=user.id;
      const admin=await ANIXIA.isAdmin();
      $("admin-status").textContent=admin?"管理者としてログインしています。":"ログイン済みですが、管理者権限がありません。";
      if(admin){
        $("admin-sync").hidden=false;
        $("admin-review-moderation").hidden=false;
        $("admin-catalog-review").hidden=false;
        $("admin-metadata-editor").hidden=false;
        $("admin-episode-review").hidden=false;
        loadAdminMetadata();
        loadPendingEpisodes();
        loadPendingReviews();
        loadPendingAnime();
      }else $("admin-setup").hidden=false;
    }catch(e){console.error(e);$("admin-status").textContent="管理者状態を確認できませんでした。";}
  }
  $("metadata-anime").addEventListener("change",loadSelectedAnimeMetadata);
  $("save-taxonomy").addEventListener("click",async()=>{
    const animeId=$("metadata-anime").value;
    if(!animeId){$("taxonomy-message").textContent="先に作品を選択してください。";return;}
    $("save-taxonomy").disabled=true;
    $("taxonomy-message").textContent="保存しています…";
    try{
      await ANIXIA.replaceAdminAnimeTaxonomy(animeId,selectedValues($("metadata-genres")),selectedValues($("metadata-tags")));
      $("taxonomy-message").textContent="ジャンル・タグを保存しました。";
      await renderCatalogQuality(adminAnimeRows);
    }catch(e){
      console.error(e);
      $("taxonomy-message").textContent="保存できませんでした。管理者権限と入力内容を確認してください。";
    }finally{$("save-taxonomy").disabled=false;}
  });
  $("create-genre").addEventListener("click",()=>createTaxonomy("genre"));
  $("create-tag").addEventListener("click",()=>createTaxonomy("tag"));
  $("add-relation").addEventListener("click",async()=>{
    const animeId=$("metadata-anime").value;
    const relatedId=$("related-anime").value;
    const type=$("relation-type").value;
    if(!animeId||!relatedId){$("relation-message").textContent="2作品を選択してください。";return;}
    $("add-relation").disabled=true;
    try{
      await ANIXIA.saveAdminAnimeRelation(animeId,relatedId,type);
      await loadSelectedAnimeMetadata();
      $("relation-message").textContent="関連作品を登録しました。";
    }catch(e){
      console.error(e);
      $("relation-message").textContent="登録できませんでした。同じ作品を選択していないか確認してください。";
    }finally{$("add-relation").disabled=false;}
  });
  $("refresh-episodes").addEventListener("click",loadPendingEpisodes);
  $("refresh-catalog-candidates").addEventListener("click",loadPendingAnime);
  $("sync-button").addEventListener("click",async()=>{
    $("sync-button").disabled=true;$("sync-message").textContent="Annictから作品データを取得しています…";
    try{
      const start=Number($("start-page").value)||1;
      const max=Number($("max-pages").value)||3;
      const result=await ANIXIA.syncAnnictCatalog(start,max);
      $("sync-message").textContent=[
        "状態: "+result.status,
        "取得ページ数: "+result.pagesRequested,
        "確認作品数: "+result.recordsSeen,
        "未公開候補の登録・更新数: "+result.recordsInsertedOrUpdated,
        "Annict全体件数: "+(result.totalCount??"不明"),
        "次のページ: "+(result.nextPage??"完了")
      ].join("\n");
      if(result.nextPage)$("start-page").value=result.nextPage;
    }catch(e){console.error(e);$("sync-message").textContent="同期に失敗しました: "+(e.message||"設定と同期ログを確認してください。");}
    finally{$("sync-button").disabled=false;}
  });
  init();
})();
