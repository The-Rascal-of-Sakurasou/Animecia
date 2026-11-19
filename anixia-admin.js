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
          a.wikipedia_url?'<a href="'+esc(a.wikipedia_url)+'" target="_blank" rel="noopener noreferrer">参考情報</a>':"",
          a.source==="wikidata"&&a.source_id?'<a href="https://www.wikidata.org/wiki/'+encodeURIComponent(a.source_id)+'" target="_blank" rel="noopener noreferrer">Wikidata</a>':""
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
          let posterStatus="利用条件を確認できる画像は見つかりませんでした。";
          try{
            const posterResult=await ANIXIA.syncCommonsPosters({limit:1,animeIds:[button.dataset.publishAnime]});
            posterStatus=posterResult.updated?"利用条件を確認できる画像を登録しました。":"画像候補が見つからないため、代替表示にしています。";
          }catch(posterError){
            console.warn("Commons poster sync was skipped:",posterError);
            posterStatus="作品は公開しました。画像の自動照合は未完了です。";
          }
          await loadPendingAnime();
          alert("作品を公開しました。\\n"+posterStatus);
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
        const number=String(ep.episode_number||ep.episode_order||"番号未登録");
        const numberLabel=number.includes("第")||number.includes("話")?number:"第"+number+"話";
        const title=ep.title_ja||ep.title||"サブタイトル未登録";
        const meta=[ep.aired_at,ep.episode_kind,ep.source].filter(Boolean).join(" · ");
        return '<article style="padding:14px;border:1px solid #30435f;border-radius:10px;margin:10px 0;background:#0b1423">'+
          '<strong style="color:#fff;font-size:13px">'+esc(workTitle)+'</strong>'+
          '<p style="color:#f2b84d;font-size:11px;margin:6px 0">'+esc(numberLabel)+' · '+esc(title)+'</p>'+
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
      await loadAnimeDuplicateCandidates();
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

  async function loadAnimeDuplicateCandidates(){
    const el=$("anime-duplicate-candidates");
    el.innerHTML='<p class="admin-message">作品名・別名・公開年・作品形式を照合しています…</p>';
    try{
      const report=await ANIXIA.getAdminAnimeDuplicateCandidates(100);
      const items=Array.isArray(report.items)?report.items:[];
      if(!items.length){
        el.innerHTML='<p class="admin-message">現在、同一タイトル・公開年・作品形式が一致する作品候補はありません。</p>';
        return;
      }
      const formatLabels={tv:"TV",movie:"映画",ova:"OVA",web:"Web",other:"その他"};
      el.innerHTML='<p class="admin-message">候補 '+esc(String(report.candidate_count??items.length))+' 件（最大100件表示）。ここでは作品の統合を行いません。</p>'+
        items.map(item=>{
          const leftIds=(item.left_external_ids||[]).map(x=>x.source+":"+x.external_id).join(" / ")||"なし";
          const rightIds=(item.right_external_ids||[]).map(x=>x.source+":"+x.external_id).join(" / ")||"なし";
          const names=Array.isArray(item.matched_names)?item.matched_names.join(" / "):"";
          return '<article style="padding:13px;border:1px solid #30435f;border-radius:10px;margin:10px 0;background:#0b1423">'+
            '<div style="font-size:10px;color:#9fb1ca">'+esc(item.match_reason||"作品名・公開年・形式一致")+' · '+esc(String(item.release_year??"年不明"))+'年 · '+esc(formatLabels[item.format]||item.format||"形式不明")+' · 一致名称 '+esc(String(item.matched_name_count||0))+'件</div>'+
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:9px 0">'+
              '<div><strong style="color:#fff;font-size:12px">'+esc(item.left_title||item.left_original_title||"名称未設定")+'</strong><div style="font-size:10px;color:#8fa1ba">'+(item.left_is_published?"公開中":"未公開")+' · '+esc(item.left_source||"手動登録")+'</div><div style="font-size:10px;color:#aebbd0">外部ID: '+esc(leftIds)+'</div></div>'+
              '<div><strong style="color:#fff;font-size:12px">'+esc(item.right_title||item.right_original_title||"名称未設定")+'</strong><div style="font-size:10px;color:#8fa1ba">'+(item.right_is_published?"公開中":"未公開")+' · '+esc(item.right_source||"手動登録")+'</div><div style="font-size:10px;color:#aebbd0">外部ID: '+esc(rightIds)+'</div></div>'+
            '</div>'+
            '<p style="font-size:11px;color:#d8c39d;margin:6px 0">一致した名称: '+esc(names)+'</p>'+
            '<p style="font-size:10px;color:#aebbd0;margin:0">作品ID: '+esc(item.left_id)+' / '+esc(item.right_id)+'</p>'+
          '</article>';
        }).join("");
    }catch(e){
      console.error(e);
      el.innerHTML='<p class="admin-message">作品の重複候補を取得できませんでした。管理者権限とデータベース接続を確認してください。</p>';
    }
  }

  async function loadEntityDuplicateCandidates(){
    const el=$("entity-duplicate-candidates");
    el.innerHTML='<p class="admin-message">人物・キャラクター・制作会社・組織の名称を照合しています…</p>';
    try{
      const report=await ANIXIA.getAdminEntityDuplicateCandidates(100);
      const items=Array.isArray(report.items)?report.items:[];
      const labels={people:"人物",characters:"キャラクター",studios:"制作会社",organizations:"組織"};
      if(!items.length){
        el.innerHTML='<p class="admin-message">現在、重複候補はありません。検査対象は人物・キャラクター・制作会社・組織です。</p>';
        return;
      }
      el.innerHTML='<p class="admin-message">候補 '+esc(String(report.candidate_count??items.length))+' 件（最大100件表示）。名称一致だけでは統合しません。</p>'+
        items.map((item,index)=>{
          const matched=Array.isArray(item.matched_names)?item.matched_names.join(" / "):"";
          return '<article style="padding:13px;border:1px solid #30435f;border-radius:10px;margin:10px 0;background:#0b1423">'+
            '<div style="font-size:10px;color:#9fb1ca">'+esc(labels[item.entity_type]||item.entity_type)+' · 一致名称 '+esc(String(item.matched_name_count||0))+'件</div>'+
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:9px 0">'+
              '<div><strong style="color:#fff;font-size:12px">'+esc(item.left_name)+'</strong><div style="font-size:10px;color:#8fa1ba">左のレコード · 関連作品 '+esc(String(item.left_related_works??0))+'件</div><div style="font-size:10px;color:#aebbd0">外部ID: '+esc((item.left_external_ids||[]).map(x=>x.source+":"+x.external_id).join(", ")||"なし")+'</div></div>'+
              '<div><strong style="color:#fff;font-size:12px">'+esc(item.right_name)+'</strong><div style="font-size:10px;color:#8fa1ba">右のレコード · 関連作品 '+esc(String(item.right_related_works??0))+'件</div><div style="font-size:10px;color:#aebbd0">外部ID: '+esc((item.right_external_ids||[]).map(x=>x.source+":"+x.external_id).join(", ")||"なし")+'</div></div>'+
            '</div>'+
            '<p style="font-size:11px;color:#d8c39d;margin:6px 0">一致した名称: '+esc(matched)+'</p>'+
            '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
              '<button type="button" class="admin-button" data-keep-left="'+index+'">左を残して統合</button>'+
              '<button type="button" class="admin-button" data-keep-right="'+index+'">右を残して統合</button>'+
            '</div></article>';
        }).join("");
      el.querySelectorAll("[data-keep-left]").forEach(button=>{
        button.addEventListener("click",()=>mergeCandidate(items[Number(button.dataset.keepLeft)],"left"));
      });
      el.querySelectorAll("[data-keep-right]").forEach(button=>{
        button.addEventListener("click",()=>mergeCandidate(items[Number(button.dataset.keepRight)],"right"));
      });
    }catch(e){
      console.error(e);
      el.innerHTML='<p class="admin-message">重複候補を取得できませんでした。管理者権限とデータベース接続を確認してください。</p>';
    }
  }

  async function mergeCandidate(item,keepSide){
    const keepLeft=keepSide==="left";
    const targetId=keepLeft?item.left_id:item.right_id;
    const sourceId=keepLeft?item.right_id:item.left_id;
    const targetName=keepLeft?item.left_name:item.right_name;
    const sourceName=keepLeft?item.right_name:item.left_name;
    const kind={people:"人物",characters:"キャラクター",studios:"制作会社",organizations:"組織"}[item.entity_type]||item.entity_type;
    if(!confirm(kind+"「"+sourceName+"」を「"+targetName+"」へ統合します。\n\n元レコードは削除され、作品との関連情報と外部IDを残すレコードへ移します。この操作は取り消せません。\n\n本当に同一の存在だと確認できていますか？")) return;
    const buttons=[...$("entity-duplicate-candidates").querySelectorAll("button")];
    buttons.forEach(button=>button.disabled=true);
    try{
      const result=await ANIXIA.mergeAdminCatalogEntity(item.entity_type,sourceId,targetId);
      await loadEntityDuplicateCandidates();
      $("entity-duplicate-candidates").insertAdjacentHTML("afterbegin",
        '<p class="admin-message">統合しました。関連付け移動 '+esc(String(result.moved_relationships||0))+'件、重複関連の整理 '+esc(String(result.deduplicated_relationships||0))+'件。</p>');
      await renderCatalogQuality(adminAnimeRows);
    }catch(e){
      console.error(e);
      $("entity-duplicate-candidates").insertAdjacentHTML("afterbegin",
        '<p class="admin-message">統合できませんでした: '+esc(e.message||"外部IDなどの競合を確認してください。")+'</p>');
      buttons.forEach(button=>button.disabled=false);
    }
  }

  async function loadCatalogQualityHistory(){
    const el=$("quality-history-content");
    if(!el)return;
    el.innerHTML='<p class="admin-message">品質監視履歴を読み込んでいます…</p>';
    try{
      const {data,error}=await ANIXIA.getClient().rpc("admin_get_catalog_quality_history",{p_limit:30});
      if(error)throw error;
      const snapshots=data?.snapshots||[], missing=data?.missing_posters||[];
      const snapshotHtml=snapshots.length?snapshots.map(s=>
        '<article style="padding:12px;border:1px solid #30435f;border-radius:9px;margin:8px 0;background:#0b1423">'+
        '<strong style="color:#fff">'+esc(new Date(s.captured_at).toLocaleString("ja-JP"))+'</strong>'+
        '<p class="admin-message">総数 '+esc(String(s.total_works))+' / 公開 '+esc(String(s.published_works))+' / 未公開 '+esc(String(s.unpublished_works))+
        '<br>画像欠損 '+esc(String(s.published_missing_poster))+' / あらすじ欠損 '+esc(String(s.published_missing_synopsis))+
        '<br>公式URL欠損 '+esc(String(s.published_missing_official_url))+' / 制作会社欠損 '+esc(String(s.published_missing_studio))+
        '<br>重複タイトルグループ '+esc(String(s.duplicate_title_groups))+'</p></article>').join(""):'<p class="admin-message">監視履歴がありません。</p>';
      const missingHtml=missing.length?missing.map(a=>
        '<article style="padding:10px;border:1px solid #30435f;border-radius:8px;margin:7px 0;background:#0b1423">'+
        '<strong style="color:#fff">'+esc(a.title||"作品名未設定")+'</strong>'+
        '<p class="admin-message">公開年: '+esc(String(a.year||"不明"))+' / source: '+esc(a.source||"不明")+
        '<br>ID: '+esc(a.source_id||"不明")+'</p></article>').join(""):'<p class="admin-message">画像未設定の作品はありません。</p>';
      el.innerHTML='<h3 style="color:#fff">日次スナップショット</h3>'+snapshotHtml+
        '<h3 style="color:#fff">画像未設定の公開作品（最大100件）</h3>'+missingHtml;
    }catch(e){console.error(e);el.innerHTML='<p class="admin-message">履歴を読み込めませんでした。管理者権限を確認してください。</p>';}
  }
  async function renderCatalogQuality(rows){
    const el=$("catalog-quality-check");
    el.innerHTML='<p class="admin-message">作品・エピソードの品質を検査しています…</p>';
    try{
      const report=await ANIXIA.getAdminCatalogQualityReport(150);
      const summary=report.summary||{};
      const items=Array.isArray(report.items)?report.items:[];
      const stats=[
        ["検査作品数",summary.anime_checked??0],
        ["問題件数",summary.issue_count??0],
        ["重大",summary.critical_count??0],
        ["警告",summary.warning_count??0],
        ["参考",summary.info_count??0]
      ];
      const statHtml='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(105px,1fr));gap:8px;margin:12px 0">'+stats.map(([label,value])=>
        '<div style="padding:10px;border:1px solid #30435f;border-radius:8px;background:#0b1423"><div style="font-size:10px;color:#aebbd0">'+esc(label)+'</div><strong style="font-size:19px;color:#fff">'+esc(String(value))+'</strong></div>'
      ).join("")+'</div>';
      const severityLabel={critical:"重大",warning:"警告",info:"参考"};
      const issueHtml=items.map(item=>{
        const severity=item.severity||"info";
        const title=item.display_title||"タイトル未設定";
        const entity=item.entity_type==="episode"?"エピソード":"作品";
        return '<article style="padding:12px;border:1px solid #30435f;border-radius:9px;margin:8px 0;background:#0b1423">'+
          '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'+
          '<strong style="color:#fff;font-size:12px">'+esc(title)+'</strong>'+
          '<span style="font-size:10px;color:'+(severity==="critical"?"#ff8585":severity==="warning"?"#f2c36b":"#aebbd0")+'">'+esc(severityLabel[severity]||"参考")+'</span>'+
          '<span style="font-size:10px;color:#aebbd0">'+esc(entity)+' · '+(item.is_published?"公開中":"未公開")+'</span></div>'+
          '<p style="color:#d8c39d;font-size:11px;margin:7px 0 3px">'+esc(item.field_name||"確認項目")+'：'+esc(item.message||"内容を確認してください。")+'</p>'+
          (item.anime_id?'<button type="button" class="admin-button" data-edit-quality="'+esc(item.anime_id)+'">作品情報を確認</button>':"")+
          '</article>';
      }).join("");
      const capped=(summary.issue_count||0)>items.length?
        '<p class="admin-message">表示は先頭'+items.length+'件です。全体の問題件数は'+summary.issue_count+'件です。</p>':"";
      const emptyMessage=(summary.anime_checked||0)===0?
        '<p class="admin-message">作品データがまだ登録されていないため、実データの品質検査は未実施です。</p>':
        '<p class="admin-message">現在、検出された問題はありません。</p>';
      el.innerHTML=statHtml+(items.length?issueHtml:emptyMessage)+capped+
        '<p class="admin-message">検査日時：'+esc(summary.generated_at||report.generated_at||"不明")+'。この検査は候補の提示のみを行い、自動修正・自動公開はしません。</p>';
      el.querySelectorAll("[data-edit-quality]").forEach(button=>{
        button.addEventListener("click",async()=>{
          const id=button.dataset.editQuality;
          const option=[...$("metadata-anime").options].find(o=>o.value===id);
          if(!option){
            $("taxonomy-message").textContent="この作品は現在の編集候補一覧にありません。候補一覧を再読み込みしてください。";
            return;
          }
          $("metadata-anime").value=id;
          await loadSelectedAnimeMetadata();
          $("metadata-anime").scrollIntoView({behavior:"smooth",block:"center"});
        });
      });
    }catch(e){
      console.error(e);
      el.innerHTML='<p class="admin-message">品質検査を実行できませんでした。管理者権限とデータベース接続を確認してください。</p>';
    }
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
        $("admin-quality-history").hidden=false;
        loadCatalogQualityHistory();
        $("admin-poster-sync").hidden=false;
        $("admin-review-moderation").hidden=false;
        $("admin-catalog-review").hidden=false;
        $("admin-metadata-editor").hidden=false;
        $("admin-episode-review").hidden=false;
        loadAdminMetadata();
        loadEntityDuplicateCandidates();
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
  $("refresh-catalog-quality").addEventListener("click",()=>renderCatalogQuality(adminAnimeRows));
  $("refresh-quality-history")?.addEventListener("click",loadCatalogQualityHistory);
  $("refresh-entity-duplicates").addEventListener("click",loadEntityDuplicateCandidates);
  $("refresh-anime-duplicates").addEventListener("click",loadAnimeDuplicateCandidates);
  $("refresh-catalog-candidates").addEventListener("click",loadPendingAnime);
  async function runAnnictSync(mode){
    const button=mode==="preview"?$("preview-button"):$("sync-button");
    button.disabled=true;
    $("sync-message").textContent=mode==="preview"?"Annictから候補を読み込んでいます（保存はしません）…":"Annictから作品データを取得しています…";
    $("sync-preview").textContent="";
    try{
      const start=Number($("start-page").value)||1;
      const max=Number($("max-pages").value)||3;
      const result=await ANIXIA.syncAnnictCatalog(start,max,mode);
      if(mode==="preview"){
        $("sync-message").textContent="プレビュー: "+result.recordsSeen+"件。データベースへの登録・更新は行っていません。";
        $("sync-preview").textContent=(result.candidates||[]).map(item=>[
          (item.alreadyImported?"[登録済み] ":"[新規候補] ")+item.title,
          "Annict ID: "+item.sourceId,
          "形式候補: "+item.proposedFormat+" / 元データ: "+(item.sourceMedia||"不明"),
          "年・シーズン: "+(item.releaseYear||"不明")+" / "+(item.seasonName||"不明"),
          "話数: "+(item.episodeCount??"不明"),
          "公式URL: "+(item.officialUrl||"なし"),
          "公開済み: "+(item.alreadyPublished?"はい":"いいえ")
        ].join("\n")).join("\n\n");
        if(result.nextPage)$("sync-message").textContent+=" 次ページ: "+result.nextPage;
        return;
      }
      $("sync-message").textContent=[
        "状態: "+result.status,
        "取得ページ数: "+result.pagesRequested,
        "確認作品数: "+result.recordsSeen,
        "未公開候補の登録・更新数: "+result.recordsInsertedOrUpdated,
        "既存作品へのMAL IDによる紐付け数: "+(result.linkedToExistingByMALId||0),
        "Annict全体件数: "+(result.totalCount??"不明"),
        "次のページ: "+(result.nextPage??"完了")
      ].join("\n");
      $("continue-sync-button").hidden=!result.nextPage;
      if(result.nextPage)$("start-page").value=result.nextPage;
    }catch(e){
      console.error(e);
      $("sync-message").textContent="処理に失敗しました: "+(e.message||"設定と同期ログを確認してください。");
    }finally{button.disabled=false;}
  }
  async function runWikidataSync(mode){
    const button=mode==="preview"?$("wikidata-preview-button"):$("wikidata-sync-button");
    button.disabled=true;
    $("wikidata-sync-message").textContent=mode==="preview"?"Wikidataから次回候補を取得しています（保存はしません）…":"Wikidataから候補を取得して非公開登録しています…";
    $("wikidata-sync-preview").textContent="";
    try{
      const {data,error}=await ANIXIA.getClient().functions.invoke("sync-wikidata-catalog",{body:{mode,limit:Number($("wikidata-limit").value)||50}});
      if(error)throw new Error(data?.error||error.message||"同期に失敗しました。");
      if(data?.error)throw new Error(data.error);
      if(mode==="preview"){
        $("wikidata-sync-message").textContent="プレビュー: "+data.recordsSeen+"件を確認。現在の取得位置: "+data.offset+"。保存は行っていません。";
        $("wikidata-sync-preview").textContent=(data.candidates||[]).map(item=>[
          (item.alreadyImported?"[登録済み] ":"[新規候補] ")+item.title,
          "Wikidata: "+item.wikidataUrl,
          "形式: "+item.format+" / 公開年: "+(item.releaseYear||"不明")+" / 話数: "+(item.episodeCount??"不明"),
          "公開済み: "+(item.alreadyPublished?"はい":"いいえ")
        ].join("\n")).join("\n\n");
        return;
      }
      $("wikidata-sync-message").textContent=["同期完了","取得位置: "+data.offset+" → "+data.nextOffset,"取得候補: "+data.recordsSeen,"形式検査通過: "+data.validCandidates,"新規登録: "+data.recordsInsertedOrUpdated,"MyAnimeList IDの新規紐付け: "+(data.linkedMyAnimeListIds||0),data.sweepRestarted?"全体走査の先頭へ戻りました。":"次回は続きから取得します。"].join("\n");
      await loadPendingAnime();
    }catch(e){
      console.error(e);
      $("wikidata-sync-message").textContent="処理に失敗しました: "+(e.message||"管理者権限・同期ログを確認してください。");
    }finally{button.disabled=false;}
  }
  $("wikidata-preview-button").addEventListener("click",()=>runWikidataSync("preview"));
  $("wikidata-sync-button").addEventListener("click",()=>runWikidataSync("sync"));
  async function runWikidataMalIdSync(){
    const button=$("wikidata-mal-id-sync-button");
    button.disabled=true;
    $("wikidata-sync-message").textContent="WikidataのMyAnimeList ID（P4086）を照合しています…";
    $("wikidata-sync-preview").textContent="";
    try{
      const {data,error}=await ANIXIA.getClient().functions.invoke("sync-wikidata-catalog",{body:{mode:"sync_mal_ids"}});
      if(error)throw new Error(data?.error||error.message||"照合に失敗しました。");
      if(data?.error)throw new Error(data.error);
      $("wikidata-sync-message").textContent=[
        "外部ID照合完了",
        "確認した既存作品: "+(data.worksChecked??0),
        "WikidataでIDが見つかった作品: "+(data.wikidataMALIdsFound??0),
        "新規紐付け: "+(data.linked??0),
        "既に紐付け済み: "+(data.alreadyLinked??0),
        "ID未登録: "+(data.missing??0),
        "複数ID・競合のため保留: "+((data.ambiguous??0)+(data.collision??0))
      ].join("\n");
    }catch(e){
      console.error(e);
      $("wikidata-sync-message").textContent="ID照合に失敗しました: "+(e.message||"管理者権限と接続状態を確認してください。");
    }finally{button.disabled=false;}
  }
  $("wikidata-mal-id-sync-button").addEventListener("click",runWikidataMalIdSync);

  async function runSeasonMetadataSync(mode){
    const button=mode==="preview"?$("season-metadata-preview-button"):$("season-metadata-sync-button");
    button.disabled=true;
    $("season-metadata-message").textContent=mode==="preview"
      ?"AniListの外部ID照合とクール情報を確認しています（保存はしません）…"
      :"プレビュー対象のクール情報をデータベースへ反映しています…";
    $("season-metadata-preview").textContent="";
    try{
      const {data,error}=await ANIXIA.getClient().functions.invoke("sync-anime-season-metadata",{body:{mode}});
      if(error)throw new Error(data?.error||error.message||"クール情報の同期に失敗しました。");
      if(data?.error)throw new Error(data.error);
      $("season-metadata-message").textContent=[
        mode==="preview"?"プレビュー完了":"同期完了",
        "対象のTV・配信作品: "+(data.publishedSeasonalWorks??0),
        "MyAnimeList ID登録数: "+(data.malIdsFound??0),
        "AniList照合成功: "+(data.aniListMatches??0),
        "クール情報の有効候補: "+(data.candidates??0),
        "更新件数: "+(data.updated??0),
        "ID重複: "+(data.duplicateMalIds??0),
        "未照合: "+(data.unmatched??0),
        "クール情報なし: "+(data.invalidSeason??0),
        "形式不一致: "+(data.formatMismatch??0)
      ].join("\n");
      $("season-metadata-preview").textContent=(data.items||[]).map(item=>[
        item.title,
        "MAL ID: "+item.malId+" / 形式: "+item.format+"（AniList: "+item.anilistFormat+"）",
        "クール: "+item.seasonYear+"年"+({winter:"冬",spring:"春",summer:"夏",autumn:"秋"}[item.season]||item.season),
        "初回公開日: "+(item.releasedOn||"未登録"),
        "既存クール: "+(item.alreadyClassified?"あり":"なし"),
        "状態: "+(item.changed?"更新対象":"変更なし")
      ].join("\n")).join("\n\n");
    }catch(e){
      console.error(e);
      $("season-metadata-message").textContent="処理に失敗しました: "+(e.message||"管理者権限・API状態を確認してください。");
    }finally{button.disabled=false;}
  }
  $("season-metadata-preview-button").addEventListener("click",()=>runSeasonMetadataSync("preview"));
  $("season-metadata-sync-button").addEventListener("click",()=>{
    if(!window.confirm("プレビューで作品名・MAL ID・クール情報を確認しましたか？確認済みのAniList情報だけを公開作品へ反映します。"))return;
    runSeasonMetadataSync("sync");
  });

  async function runWikidataEpisodeSync(mode){
    const button=mode==="preview"?$("wikidata-episode-preview-button"):$("wikidata-episode-sync-button");
    button.disabled=true;
    $("wikidata-episode-sync-message").textContent=mode==="preview"?"Wikidataからエピソード候補を確認しています（保存はしません）…":"Wikidataのエピソードを非公開で登録しています…";
    $("wikidata-episode-sync-preview").textContent="";
    try{
      const {data,error}=await ANIXIA.getClient().functions.invoke("sync-wikidata-episodes",{
        body:{mode,limit:Number($("wikidata-episode-limit").value)||8}
      });
      if(error)throw new Error(data?.error||error.message||"同期に失敗しました。");
      if(data?.error)throw new Error(data.error);
      const results=data.results||[];
      $("wikidata-episode-sync-message").textContent=[
        mode==="preview"?"プレビュー完了":"同期完了",
        "確認作品数: "+(data.worksChecked??0),
        "検索リクエスト数: "+(data.queriesRequested??0),
        "取得候補: "+(data.recordsSeen??0),
        "新規登録: "+(data.recordsInserted??0),
        "登録データはすべて非公開です。"
      ].join("\n");
      $("wikidata-episode-sync-preview").textContent=results.map(item=>[
        item.title,
        "Wikidata: "+(item.sourceUrl||("https://www.wikidata.org/wiki/"+item.workId)),
        "状態: "+item.status,
        "既存エピソード: "+(item.existingEpisodes??0),
        "取得候補: "+(item.candidates??0),
        "新規候補: "+(item.newCandidates??0)
      ].join("\n")).join("\n\n");
      if(mode==="sync")await loadPendingEpisodes();
    }catch(e){
      console.error(e);
      $("wikidata-episode-sync-message").textContent="処理に失敗しました: "+(e.message||"管理者権限・同期ログを確認してください。");
    }finally{button.disabled=false;}
  }
  $("wikidata-episode-preview-button").addEventListener("click",()=>runWikidataEpisodeSync("preview"));
  $("wikidata-episode-sync-button").addEventListener("click",()=>runWikidataEpisodeSync("sync"));
  $("poster-sync-button").addEventListener("click",async()=>{
    const button=$("poster-sync-button");
    button.disabled=true;
    $("poster-sync-message").textContent="Wikimedia Commonsで作品名と画像ライセンスを確認しています…";
    try{
      const result=await ANIXIA.syncCommonsPosters({
        limit:Number($("poster-sync-limit").value)||20,
        force:$("poster-sync-force").checked
      });
      $("poster-sync-message").textContent=[
        "確認作品数: "+result.scanned,
        "画像登録数: "+result.updated,
        "ライセンス確認済み画像なし: "+(result.unmatched||[]).length,
        "エラー: "+(result.errors||[]).length,
        (result.unmatched||[]).length?"画像なし: "+result.unmatched.join("、"):"",
        (result.errors||[]).length?"エラー詳細: "+result.errors.join(" / "):""
      ].filter(Boolean).join("\n");
    }catch(e){
      console.error(e);
      $("poster-sync-message").textContent="同期できませんでした: "+(e.message||"管理者権限・接続状態を確認してください。");
    }finally{button.disabled=false;}
  });
  $("preview-button").addEventListener("click",()=>runAnnictSync("preview"));
  $("sync-button").addEventListener("click",()=>runAnnictSync("sync"));
  async function runAnnictDetailSync(){
    const button=$("detail-sync-button");
    const workId=$("detail-work-id").value.trim();
    if(!/^\d{1,12}$/.test(workId)){
      $("detail-sync-message").textContent="Annict作品IDは1〜12桁の数字で入力してください。";
      return;
    }
    const pages={
      episodes:$("detail-episode-page").value.trim()===""?1:Math.max(0,Number($("detail-episode-page").value)||0),
      casts:$("detail-cast-page").value.trim()===""?1:Math.max(0,Number($("detail-cast-page").value)||0),
      staffs:$("detail-staff-page").value.trim()===""?1:Math.max(0,Number($("detail-staff-page").value)||0)
    };
    button.disabled=true;
    $("detail-continue-button").disabled=true;
    $("detail-sync-message").textContent="詳細データを取得・保存しています…";
    try{
      const result=await ANIXIA.syncAnnictWorkDetails(workId,pages);
      const next=result.nextPages||{};
      $("detail-episode-page").value=next.episodes??0;
      $("detail-cast-page").value=next.casts??0;
      $("detail-staff-page").value=next.staffs??0;
      $("detail-continue-button").hidden=!result.hasMore;
      $("detail-sync-message").textContent=[
        "処理状態: "+result.status,
        "作品: "+(result.workTitle||workId),
        "取得ページ数: "+result.pagesRequested,
        "取得レコード数: "+result.recordsSeen,
        "登録・更新数: "+result.recordsInsertedOrUpdated,
        "エピソード: "+(result.counts?.episodes??0),
        "キャスト: "+(result.counts?.castEntries??0),
        "スタッフ: "+(result.counts?.staffEntries??0),
        "次ページ: エピソード "+(next.episodes??"完了")+" / キャスト "+(next.casts??"完了")+" / スタッフ "+(next.staffs??"完了")
      ].join("\n");
    }catch(e){
      console.error(e);
      $("detail-sync-message").textContent="同期に失敗しました: "+(e.message||"管理ログを確認してください。");
    }finally{
      button.disabled=false;
      $("detail-continue-button").disabled=false;
    }
  }
  $("detail-sync-button").addEventListener("click",runAnnictDetailSync);
  $("detail-continue-button").addEventListener("click",runAnnictDetailSync);
  $("continue-sync-button").addEventListener("click",()=>runAnnictSync("sync"));
  init();
})();
