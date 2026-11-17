(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  async function init(){
    try{
      const user=await ANIXIA.getUser();
      if(!user){$("admin-status").textContent="ログインが必要です。";return;}
      $("user-id").textContent=user.id;
      const admin=await ANIXIA.isAdmin();
      $("admin-status").textContent=admin?"管理者としてログインしています。":"ログイン済みですが、管理者権限がありません。";
      if(admin)$("admin-sync").hidden=false;else $("admin-setup").hidden=false;
    }catch(e){console.error(e);$("admin-status").textContent="管理者状態を確認できませんでした。";}
  }
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
        "登録・更新数: "+result.recordsInsertedOrUpdated,
        "Annict全体件数: "+(result.totalCount??"不明"),
        "次のページ: "+(result.nextPage??"完了")
      ].join("\n");
      if(result.nextPage)$("start-page").value=result.nextPage;
    }catch(e){console.error(e);$("sync-message").textContent="同期に失敗しました。ANNICT_ACCESS_TOKEN、管理者権限、同期ログを確認してください。";}
    finally{$("sync-button").disabled=false;}
  });
  init();
})();
