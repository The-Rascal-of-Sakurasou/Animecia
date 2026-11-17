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
        loadPendingReviews();
        loadPendingAnime();
      }else $("admin-setup").hidden=false;
    }catch(e){console.error(e);$("admin-status").textContent="管理者状態を確認できませんでした。";}
  }
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
