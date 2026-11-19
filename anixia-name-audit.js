(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const labels = {
    people:"人物・声優・スタッフ",
    characters:"キャラクター",
    studios:"制作会社",
    organizations:"制作組織"
  };
  const issueLabels = {
    missing_japanese_name:"日本語表示名が未登録",
    hiragana_name_needs_official_check:"ひらがな表記の公式確認が必要",
    latin_name_in_japanese_field:"日本語欄に英字表記",
    missing_kana_reading:"漢字名の読み仮名が未登録",
    name_and_reading_identical:"表示名と読み仮名が同一"
  };
  function sourceLink(item) {
    if (item.source === "wikidata" && item.source_id) {
      return '<a href="https://www.wikidata.org/wiki/' + encodeURIComponent(item.source_id) +
        '" target="_blank" rel="noopener noreferrer">Wikidataで確認</a>';
    }
    return "";
  }
  async function init() {
    const panel = $("admin-name-audit");
    if (!panel || !window.ANIXIA) return;
    try {
      const user = await ANIXIA.getUser();
      if (!user || !(await ANIXIA.isAdmin())) return;
      panel.hidden = false;
      $("name-audit-run").addEventListener("click", run);
      await run();
    } catch (error) {
      console.error(error);
    }
  }
  async function run() {
    const button = $("name-audit-run");
    const status = $("name-audit-status");
    const list = $("name-audit-results");
    button.disabled = true;
    status.textContent = "人物・キャラクター・制作会社・組織の名称を全件検査しています…";
    list.innerHTML = "";
    try {
      const { data, error } = await ANIXIA.getClient().rpc("admin_get_name_quality_report", { p_limit: 1000 });
      if (error) throw error;
      const report = data || {};
      const summary = report.summary || {};
      const items = Array.isArray(report.items) ? report.items : [];
      status.textContent = [
        "検査完了: " + (summary.entities_checked ?? 0) + "件",
        "人物 " + (summary.people_checked ?? 0),
        "キャラクター " + (summary.characters_checked ?? 0),
        "制作会社 " + (summary.studios_checked ?? 0),
        "制作組織 " + (summary.organizations_checked ?? 0),
        "確認候補 " + (summary.issue_count ?? 0) + "件",
        "ひらがな表記 " + (summary.hiragana_name_count ?? 0) + "件",
        "日本語名未登録 " + (summary.missing_name_count ?? 0) + "件",
        "読み仮名未登録 " + (summary.missing_reading_count ?? 0) + "件",
        "検査日時 " + (report.generated_at ? new Date(report.generated_at).toLocaleString("ja-JP") : "不明")
      ].join(" / ");
      if (!items.length) {
        list.innerHTML = '<p class="admin-message">名称の確認候補はありません。</p>';
        return;
      }
      list.innerHTML = items.map(item => {
        const title = item.primary_name || item.original_name || item.english_name || "名称未設定";
        const meta = [
          labels[item.entity_type] || item.entity_type,
          item.entity_subtype,
          "関連作品 " + (item.related_count ?? 0) + "件"
        ].filter(Boolean).join(" · ");
        const source = [item.source, item.source_id].filter(Boolean).join(" / ");
        return '<article style="padding:13px;border:1px solid #30435f;border-radius:10px;margin:9px 0;background:#0b1423">' +
          '<strong style="color:#fff;font-size:13px">' + esc(title) + '</strong>' +
          '<p style="color:#f2b84d;font-size:11px;margin:6px 0">' + esc(issueLabels[item.issue_code] || item.issue_code) + '</p>' +
          '<p style="color:#aebbd0;font-size:11px;margin:5px 0">' + esc(meta) + '</p>' +
          '<p style="color:#dbe4f0;font-size:11px;margin:5px 0">読み仮名: ' + esc(item.reading || "未登録") +
            ' / 英語名: ' + esc(item.english_name || "未登録") + '</p>' +
          '<p style="color:#aebbd0;font-size:10px;margin:5px 0">元名称: ' + esc(item.original_name || "未登録") +
            ' / 出典: ' + esc(source || "未登録") + '</p>' +
          (item.related_titles ? '<p style="color:#aebbd0;font-size:10px;margin:5px 0">関連作品: ' + esc(item.related_titles) + '</p>' : '') +
          '<p style="font-size:11px;margin:6px 0">' + sourceLink(item) + '</p>' +
          '<p style="color:#d8c39d;font-size:10px;margin:6px 0">自動修正は行っていません。公式プロフィール・公式クレジット等で表記を確認してください。</p>' +
          '</article>';
      }).join("");
      if ((summary.issue_count || 0) > items.length) {
        list.insertAdjacentHTML("afterbegin", '<p class="admin-message">表示は先頭1000件です。候補全体は' +
          esc(summary.issue_count) + '件です。</p>');
      }
    } catch (error) {
      console.error(error);
      status.textContent = "名称検査に失敗しました。管理者権限・データベース接続を確認してください。";
      list.innerHTML = '<p class="admin-message">' + esc(error.message || "詳細不明のエラー") + '</p>';
    } finally {
      button.disabled = false;
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true });
  else init();
})();