/* ANIXIA global language and accessibility layer.
 * UI language: Japanese / English. User-generated text and proper names are never machine-translated.
 */
(() => {
  "use strict";
  const KEY = "anixia-language";
  const ja = {
    "ホーム":"Home","作品検索":"Anime","作品データベース":"Anime Database","人物・団体":"People & Studios","人物・キャラクター・制作会社":"People, Characters & Studios",
    "今期アニメ":"Seasonal Anime","今期":"Season","ランキング":"Rankings","クイズ":"Quiz","クイズ一覧":"Quiz List","おすすめ診断":"Recommendations","おすすめ":"Recommendations",
    "コミュニティ":"Community","マイページ":"My Page","マイライブラリ":"My Library","ログイン":"Log in","ログアウト":"Log out","新規登録":"Sign up",
    "作品詳細":"Anime Details","人物詳細":"People Details","ジャンルから探す":"Browse by Genre","作品を探す":"Find Anime","アニメ作品を探す":"Find Anime",
    "アニメ作品検索":"Anime Search","アニメ作品比較":"Compare Anime","作品比較":"Compare Anime","作品一覧":"All Anime","詳細検索":"Advanced Search",
    "検索":"Search","検索する":"Search","クリア":"Clear","リセット":"Reset","絞り込む":"Filter","絞り込み":"Filters","並び替え":"Sort",
    "人気の作品":"Popular Anime","最近追加された作品":"Recently Added","放送中":"Currently Airing","放送予定":"Upcoming",
    "すべて":"All","すべて表示":"View All","もっと見る":"See More","続きを読む":"Read More","戻る":"Back","閉じる":"Close","保存":"Save","更新":"Update",
    "送信":"Submit","投稿":"Post","削除":"Delete","編集":"Edit","キャンセル":"Cancel","確認":"Confirm","次へ":"Next","前へ":"Previous",
    "メールアドレス":"Email Address","パスワード":"Password","パスワードを忘れた場合":"Forgot password?","表示名":"Display Name","ユーザー名":"Username",
    "作品名":"Title","ジャンル":"Genre","放送年":"Year","放送時期":"Season","形式":"Format","制作会社":"Studio","評価":"Score","レビュー":"Reviews",
    "あらすじ":"Synopsis","基本情報":"Information","関連作品":"Related Anime","キャラクター":"Characters","声優":"Voice Actors","スタッフ":"Staff",
    "作品情報":"Anime Information","放送情報":"Broadcast Information","公式サイト":"Official Website","データ出典":"Data Sources",
    "視聴状況":"Watch Status","視聴履歴":"Watch History","お気に入り":"Favorites","視聴中":"Watching","視聴予定":"Plan to Watch","視聴済み":"Completed","一時停止":"On Hold","視聴断念":"Dropped",
    "ユーザーを検索":"Search Users","ユーザー検索":"User Search","プロフィール":"Profile","メッセージ":"Messages","通知":"Notifications",
    "アニメクイズ":"Anime Quiz","クイズに挑戦":"Take the Quiz","結果":"Results","おすすめアニメ診断":"Anime Recommendations",
    "作品を比較":"Compare Titles","比較する":"Compare","選択してください":"Please select","読み込み中...":"Loading...",
    "作品情報を読み込んでいます":"Loading anime information","データがありません":"No data available","該当する作品がありません":"No matching titles",
    "エラーが発生しました":"An error occurred","もう一度お試しください":"Please try again","ログインしてください":"Please log in",
    "ANIXIAの機能":"Explore ANIXIA","アニメ作品を探す":"Find Anime","作品を探す、記録する、知識を深める。すべての機能へ。":"Discover anime, track your list, and explore more.",
    "人気・評価から探す":"Browse by popularity and score","好みから作品を見つける":"Find anime you'll love","視聴状況・お気に入りを管理":"Manage your watchlist and favorites",
    "作品情報・ジャンル・制作会社":"Titles, genres and studios","放送中・放送予定の作品を探す":"Browse airing and upcoming titles",
    "作品名・英語名・旧称・人物名・制作会社などで検索":"Search titles, alternate names, people and studios",
    "作品名・英語名・読み仮名で検索":"Search by title, English title or reading",
    "ユーザー名や表示名からANIXIAユーザーを探せます。":"Find ANIXIA users by username or display name.",
    "ユーザー名・表示名を入力":"Enter a username or display name","検索したいユーザー名や表示名を入力してください。":"Enter a username or display name to search.",
    "メールアドレスを入力":"Enter your email address","ANIXIAアカウントにログインします。":"Log in to your ANIXIA account.",
    "新しくアカウントを作成":"Create a new account","アカウントを作成":"Create Account",
    "ユーザーの投稿・交流を見る":"Explore community posts and discussions","ユーザーの感想を読む":"Read user reviews",
    "気になるジャンルから作品を絞り込む":"Filter anime by genre","ジャンルやテーマから作品を発見":"Discover anime by genre and theme",
    "多くのユーザーに視聴されている作品":"Popular titles among users","データベースに追加・更新された作品":"Recently added or updated titles"
  };
  const titles = {
    "ANIXIA — アニメデータベース":"ANIXIA — Anime Database",
    "アニメ作品検索｜ANIXIA":"Anime Database | ANIXIA","アニメランキング｜ANIXIA":"Anime Rankings | ANIXIA",
    "今期アニメ｜ANIXIA":"Seasonal Anime | ANIXIA","作品詳細｜ANIXIA":"Anime Details | ANIXIA",
    "人物・キャラクター・制作会社詳細｜ANIXIA":"People, Characters & Studios | ANIXIA",
    "アニメ作品比較｜ANIXIA":"Compare Anime | ANIXIA","アニメを発見する｜ANIXIA":"Discover Anime | ANIXIA",
    "ジャンルから探す | ANIXIA":"Browse by Genre | ANIXIA","マイページ｜ANIXIA":"My Page | ANIXIA",
    "ログイン｜ANIXIA":"Log in | ANIXIA","アニメクイズ｜ANIXIA":"Anime Quiz | ANIXIA",
    "クイズに挑戦｜ANIXIA":"Take the Quiz | ANIXIA","おすすめアニメ診断｜ANIXIA":"Anime Recommendations | ANIXIA",
    "コミュニティ | ANIXIA":"Community | ANIXIA","プロフィール | ANIXIA":"Profile | ANIXIA",
    "メッセージ | ANIXIA":"Messages | ANIXIA","ユーザー検索 | ANIXIA":"Search Users | ANIXIA"
  };
  const readLang = () => {
    const v = localStorage.getItem(KEY);
    return v === "en" ? "en" : "ja";
  };
  let lang = readLang();
  const mapText = (value) => {
    if (lang !== "en") return value;
    const trimmed = value.trim();
    if (!trimmed || !ja[trimmed]) return value;
    return value.replace(trimmed, ja[trimmed]);
  };
  const translateStatic = (root = document) => {
    if (lang === "en") {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(n => { const v = mapText(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; });
      root.querySelectorAll?.("input[placeholder],textarea[placeholder],[aria-label],[title]").forEach(el => {
        for (const attr of ["placeholder","aria-label","title"]) {
          const v = el.getAttribute(attr);
          if (v && ja[v.trim()]) el.setAttribute(attr, mapText(v));
        }
      });
      if (titles[document.title]) document.title = titles[document.title];
    } else {
      location.reload();
    }
  };
  const makeControl = () => {
    let btn = document.getElementById("language-toggle");
    if (btn) {
      const fresh = btn.cloneNode(true);
      btn.replaceWith(fresh);
      btn = fresh;
    } else {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "anixia-language";
      btn.id = "language-toggle";
      btn.setAttribute("aria-label","Change language");
      const host = document.querySelector(".header-inner,.container.nav,.wrap.head,.anixia-header-actions,header .nav,header");
      if (host) host.appendChild(btn);
      else {
        const bar = document.createElement("div");
        bar.className = "anixia-language-fallback";
        bar.appendChild(btn);
        document.body.prepend(bar);
      }
    }
    btn.classList.add("anixia-language");
    btn.textContent = lang === "ja" ? "EN" : "日本語";
    btn.setAttribute("aria-label", lang === "ja" ? "Switch to English" : "日本語に切り替える");
    btn.addEventListener("click", () => {
      lang = lang === "ja" ? "en" : "ja";
      localStorage.setItem(KEY, lang);
      location.reload();
    });
  };
  const init = () => {
    document.documentElement.lang = lang;
    makeControl();
    if (lang === "en") translateStatic();
    document.documentElement.dataset.anixiaLanguage = lang;
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
  window.ANIXIA_LANG = () => lang;
  window.ANIXIA_SET_LANGUAGE = value => {
    if (value !== "ja" && value !== "en") return;
    localStorage.setItem(KEY,value);
    location.reload();
  };
})();