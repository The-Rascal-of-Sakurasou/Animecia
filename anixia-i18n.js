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
    "あらすじ":"Synopsis","基本情報":"Information","アニメ作品情報":"Anime Information","ANIXIA / アニメ作品情報":"ANIXIA / Anime Information","作品データベースに戻る":"Back to Anime Database","作品ページへ":"View Anime Page","評価・レビュー":"Scores & Reviews","作品を評価":"Rate this Anime","レビューを書く":"Write a Review","視聴記録":"Watch History","視聴記録を追加":"Add to Watchlist","関連する作品":"Related Anime","放送開始日":"Start Date","放送終了日":"End Date","放送局":"Broadcaster","話数":"Episodes","制作":"Production","原作":"Original Work","監督":"Director","シリーズ構成":"Series Composition","音楽":"Music","主題歌":"Theme Songs","キャスト":"Cast","スタッフ・キャスト":"Staff & Cast","作品データ":"Anime Data","作品情報を確認":"View Anime Information",
    "タイトルやジャンル、放送時期などを組み合わせて、気になる作品を検索できます。":"Combine titles, genres and seasons to find anime.",
    "作品・人物・キャラクター・制作会社・組織":"Titles, people, characters, studios and organizations",
    "クール":"Season","冬":"Winter","春":"Spring","夏":"Summer","秋":"Fall","劇場版":"Movie","特別編":"Special","その他":"Other",
    "タグ（複数選択可）":"Tags (multiple selection)","複数選択すると、いずれかのタグを持つ作品を表示します。":"Titles matching any selected tag will be shown.",
    "声優・スタッフ（別名を含む）":"Voice actors / staff (including aliases)","キャラクター（別名を含む）":"Characters (including aliases)",
    "並び順":"Sort by","新着・新しい順":"Newest first","視聴者数順":"Most watched","レビュー数順":"Most reviewed","評価順（5件以上）":"Highest rated (5+ ratings)","タイトル順":"Title",
    "検索条件を設定してください。":"Set your search filters.","条件をクリア":"Clear filters","検索結果":"Search Results","1ページ目":"Page 1",
    "人物・声優・スタッフ":"People, voice actors & staff","名前で検索":"Search by name","データを読み込んでいます…":"Loading data…",
    "放送年とクールから、対象シーズンの作品を探せます。":"Browse anime by year and season.","年":"Year",
    "評価ランキング":"Top Rated","人気ランキング":"Most Popular","レビュー数":"Most Reviews","新着作品":"Recently Added",
    "タグ・テーマ":"Tags & Themes","シリーズ":"Series","エピソード":"Episodes","制作団体":"Production Organizations","レビューを投稿":"Write a Review",
    "ログイン状態を確認しています…":"Checking login status…","← 人物・キャラクター・制作会社一覧へ戻る":"← Back to People, Characters & Studios",
    "情報を読み込んでいます…":"Loading information…",
    "アカウントを作成すると、そのままANIXIAにログインします。メール認証コードの入力は必要ありません。":"Creating an account will sign you in to ANIXIA. No email verification code is required.",
    "パスワード（8文字以上）":"Password (8+ characters)","パスワード（確認）":"Confirm password","ログインはこちら":"Log in here",
    "作品に関するクイズに挑戦して、知識を試してみましょう。回答の採点はサーバー側で行います。":"Test your anime knowledge with quizzes. Answers are graded on the server.",
    "回答を送信して採点":"Submit answers",
    "好みのジャンルや視聴条件を選ぶと、条件に合う作品を優先して表示します。AIではなく、選択条件と一致数に基づく診断です。":"Choose genres and viewing preferences to find matching titles. Recommendations are based on your selections, not AI.",
    "どんな作品を探していますか？":"What kind of anime are you looking for?",
    "ジャンルは最大3つまで選択できます。何も選ばない場合は人気作品を中心に表示します。":"Select up to 3 genres. Leave blank to focus on popular titles.",
    "ジャンルを読み込んでいます…":"Loading genres…","作品形式":"Format","指定しない":"Any","TVアニメ":"TV Anime",
    "おすすめを診断する":"Get Recommendations","条件を選択して診断してください。":"Choose your preferences to get recommendations.",
    "視聴記録やお気に入り、自分の評価をまとめて管理できます。":"Manage your watch history, favorites and ratings.",
    "アカウント情報を確認しています…":"Checking account information…","ログインが必要です":"Login Required",
    "マイページを利用するにはログインしてください。":"Please log in to use My Page.","ログインする":"Log in","プロフィールを保存":"Save Profile",
    "自分の評価":"My Ratings","実績":"Achievements","視聴記録":"Watch History","お気に入り":"Favorites",
    "表示名":"Display Name","ユーザーID":"User ID","自己紹介":"Bio","アカウント":"Account",
    "今期の作品":"This Season","人気作品":"Popular Anime","最近見た作品":"Recently Viewed",
    "検索条件":"Search Filters","該当するデータがありません":"No matching data","まだ投稿はありません":"No posts yet",
    "投稿を読み込んでいます…":"Loading posts…","メッセージを入力":"Write a message","メッセージを送信":"Send Message",
    "ユーザーを検索":"Search Users","フォロー":"Follow","フォロー中":"Following","フォロワー":"Followers","投稿":"Posts",
    "プライバシーポリシー":"Privacy Policy","利用規約":"Terms of Service","お問い合わせ":"Contact",
    "データ出典と利用条件":"Data Sources & Terms","読み込みに失敗しました":"Failed to load","再読み込み":"Reload",
    "作品が見つかりませんでした":"No anime found","人物が見つかりませんでした":"No people found",
    "比較する作品を選択してください。":"Select anime to compare.","比較結果":"Comparison Results",
    "この作品をマイライブラリに追加":"Add to My Library","マイライブラリに追加":"Add to My Library","マイライブラリから削除":"Remove from My Library",
    "評価を保存":"Save Rating","レビューを保存":"Save Review","レビュー":"Reviews","評価する":"Rate",
    "作品の詳細情報":"Detailed Anime Information","基本情報":"Basic Information","関連情報":"Related Information","関連作品":"Related Anime","キャラクター":"Characters","声優":"Voice Actors","スタッフ":"Staff",
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
  Object.assign(ja, {
    "アニメを探す":"Find Anime","作品比較":"Compare Anime","ジャンル":"Genre","メモ":"Notes","投稿する":"Create Post","写真を追加":"Add Photo","最大4枚・各10MB以下":"Up to 4 images, 10 MB each","フォロー中":"Following","ブックマーク":"Bookmarks","読み込み中…":"Loading…","もっと読み込む":"Load More","ユーザーを探す":"Find Users","投稿、返信、いいね、リポスト、ブックマークでアニメの感想を共有できます。":"Share your thoughts on anime with posts, replies, likes, reposts and bookmarks.",
    "作品を比較する":"Compare Anime","作品を検索して2〜3作品を選ぶと、基本情報を横並びで比較できます。":"Search for and select 2–3 titles to compare their key information side by side.",
    "作品を検索":"Search Anime","作品名を入力して検索してください。":"Enter an anime title to search.","選択した作品を比較":"Compare Selected Titles","2〜3作品を選択すると比較結果を表示します。":"Select 2–3 titles to see a comparison.",
    "新しい作品と出会う":"Discover Something New","ジャンルや人気作品から、次に観たいアニメを探しましょう。":"Find your next anime by exploring genres and popular titles.",
    "詳細検索 →":"Advanced Search →","ランキング →":"Rankings →","作品を読み込んでいます…":"Loading anime…","最近の作品":"Recently Added","すべての作品 →":"All Anime →",
    "ジャンルから探す。":"Browse by genre.","気分や好みからジャンルを選んで、そのまま作品探索へ。複数ジャンルの組み合わせにも対応しています。":"Choose genres based on your mood and preferences, then explore matching titles. You can combine multiple genres.",
    "ジャンルを読み込み中…":"Loading genres…",
    "1対1":"Direct","グループ":"Group","会話を選択してください":"Select a conversation","プロフィール":"Profile",
    "会話を選択すると、ここにメッセージが表示されます。":"Select a conversation to view messages here.","送信":"Send","ログインが必要です。":"Login required.",
    "ホームへ戻る":"Back to Home","← ホームへ戻る":"← Back to Home","最終更新日：2026年9月26日":"Last updated: September 26, 2026",
    "データ出典・利用条件":"Data Sources & Terms","初期作品データ":"Initial Anime Dataset","初期登録作品":"Initially Registered Anime",
    "プライバシーポリシー":"Privacy Policy","利用規約":"Terms of Service","アニメをもっと探しやすく、もっと楽しめる。":"Discover anime more easily and enjoy it more.",
    "作品・人物・キャラクター・制作会社・組織":"Anime, people, characters, studios and organizations",
    "タイトルやジャンル、放送時期などを組み合わせて、気になる作品を検索できます。":"Combine titles, genres and seasons to find anime.",
    "作品情報を読み込んでいます…":"Loading anime information…","作品を読み込んでいます…":"Loading anime…",
    "レビュー数":"Review Count","評価":"Rating","人気度":"Popularity","視聴者数":"Viewers",
    "評価・レビュー":"Scores & Reviews","作品を評価":"Rate this Anime","レビューを書く":"Write a Review",
    "作品詳細":"Anime Details","作品情報":"Anime Information","タグ・テーマ":"Tags & Themes","シリーズ":"Series",
    "制作団体":"Production Organizations","キャラクター":"Characters","スタッフ":"Staff","レビューを投稿":"Write a Review",
    "情報を読み込んでいます…":"Loading information…","基本情報":"Basic Information","関連情報":"Related Information",
    "ログイン状態を確認しています…":"Checking login status…","ログインが必要です":"Login Required",
    "アカウント情報を確認しています…":"Checking account information…","プロフィールを保存":"Save Profile","ユーザーID":"User ID","自己紹介":"Bio",
    "視聴記録やお気に入り、自分の評価をまとめて管理できます。":"Manage your watch history, favorites and ratings.",
    "ログインが必要です":"Login Required","マイページを利用するにはログインしてください。":"Please log in to use My Page.",
    "どんな作品を探していますか？":"What kind of anime are you looking for?",
    "おすすめを診断する":"Get Recommendations","条件を選択して診断してください。":"Choose your preferences to get recommendations.",
    "作品に関するクイズに挑戦して、知識を試してみましょう。回答の採点はサーバー側で行います。":"Test your anime knowledge with quizzes. Answers are graded on the server.",
    "回答を送信して採点":"Submit answers","アカウントを作成すると、そのままANIXIAにログインします。メール認証コードの入力は必要ありません。":"Creating an account will sign you in to ANIXIA. No email verification code is required.",
    "パスワード（8文字以上）":"Password (8+ characters)","パスワード（確認）":"Confirm password","ログインはこちら":"Log in here"
  });
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
  const ensureHeader = () => {
    if (document.querySelector("header,.site-header")) return;
    const header = document.createElement("header");
    header.className = "anixia-global-header";
    header.innerHTML = '<div class="anixia-global-header-inner"><a class="anixia-logo" href="/anixia/" aria-label="ANIXIA home">ANI<span class="anixia-logo-xia">XIA</span></a><nav aria-label="Main navigation"><a href="/anixia/">ホーム</a><a href="/anixia/anime.html">作品データベース</a><a href="/anixia/season.html">今期アニメ</a><a href="/anixia/ranking.html">ランキング</a><a href="/anixia/entities.html">人物・団体</a><a href="/anixia/community.html">コミュニティ</a></nav><div class="anixia-header-actions"></div></div>';
    document.body.prepend(header);
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
    ensureHeader();
    makeControl();
    if (lang === "en") translateStatic();
    document.documentElement.dataset.anixiaLanguage = lang;
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
  const observer = new MutationObserver(records => {
    if (lang !== "en") return;
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const translated = mapText(node.nodeValue);
          if (translated !== node.nodeValue) node.nodeValue = translated;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          translateStatic(node);
        }
      }
    }
  });
  observer.observe(document.documentElement, {childList:true,subtree:true});
  window.ANIXIA_LANG = () => lang;
  window.ANIXIA_SET_LANGUAGE = value => {
    if (value !== "ja" && value !== "en") return;
    localStorage.setItem(KEY,value);
    location.reload();
  };
})();
/* Retrofit workflow trigger: global language layer revision 2. */

/* Shared bilingual UI cache revision 2. */
