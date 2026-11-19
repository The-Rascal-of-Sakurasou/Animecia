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
  Object.assign(ja, {
    "ANIME DATABASE":"ANIME DATABASE","アニメ作品を探す":"Find Anime","タイトルやジャンル、放送時期などを組み合わせて、気になる作品を検索できます。":"Search anime by title, genre, season and more.",
    "放送年とクールから、対象シーズンの作品を探せます。":"Browse anime by year and season.",
    "作品の評価や利用状況から、注目されているアニメを探せます。":"Explore anime based on ratings and activity.",
    "声優やスタッフ、作品に登場するキャラクター、アニメ制作会社を横断して探せます。":"Search across voice actors, staff, characters and animation studios.",
    "ANIME RANKING":"ANIME RANKING","SEASONAL ANIME":"SEASONAL ANIME","ANIME PEOPLE & ENTITIES":"ANIME PEOPLE & ENTITIES",
    "作品・人物・キャラクター・制作会社・組織":"Anime, people, characters, studios and organizations",
    "作品情報を読み込んでいます…":"Loading anime information…","ランキングを読み込んでいます…":"Loading rankings…",
    "投稿する":"Create Post","写真を追加":"Add Photos","最大4枚・各10MB以下":"Up to 4 images, 10 MB each","0 / 4000":"0 / 4000",
    "フォロー中":"Following","ブックマーク":"Bookmarks","読み込み中…":"Loading…","もっと読み込む":"Load More",
    "ユーザーを探す":"Find Users","投稿、返信、いいね、リポスト、ブックマークでアニメの感想を共有できます。":"Share your thoughts on anime through posts, replies, likes, reposts and bookmarks.",
    "1対1":"Direct","グループ":"Group","‹ 会話を選択してください":"‹ Select a conversation",
    "会話を選択すると、ここにメッセージが表示されます。":"Select a conversation to view messages here.",
    "ログインが必要です。":"Login required.","メッセージ":"Messages","送信":"Send",
    "ユーザー検索":"User Search","ユーザー名や表示名からANIXIAユーザーを探せます。":"Find ANIXIA users by username or display name.",
    "検索したいユーザー名や表示名を入力してください。":"Enter a username or display name to search.",
    "検索したいユーザー名や表示名を入力":"Enter a username or display name",
    "データ出典・利用条件":"Data Sources & Terms","TRANSPARENCY":"TRANSPARENCY",
    "ANIXIAは、作品情報の出典と利用条件を確認し、出典ごとに利用可能な情報だけを取り扱います。":"ANIXIA reviews the sources and usage terms for anime information and uses only data permitted by each source.",
    "Wikidata":"Wikidata","初期作品データに、Wikidataの構造化データを使用しています。Wikidataの構造化データはCC0で提供されています。出典表示は必須ではありませんが、データの出所としてWikidataを記載することが推奨されています。":"The initial anime dataset uses structured data from Wikidata. Wikidata's structured data is provided under CC0. Attribution is not required, but identifying Wikidata as the data source is recommended.",
    "最終更新日：2026年9月26日":"Last updated: September 26, 2026",
    "プライバシーポリシー":"Privacy Policy","利用規約":"Terms of Service","お問い合わせ":"Contact",
    "ホームへ戻る":"Back to Home","← ホームへ戻る":"← Back to Home",
    "ANIXIA アニメをもっと探しやすく、もっと楽しめる。":"ANIXIA — Discover anime more easily and enjoy it more.",
    "アニメをもっと探しやすく、もっと楽しめる。":"Discover anime more easily and enjoy it more.",
    "検索条件を設定してください。":"Set your search filters.","条件をクリア":"Clear filters","検索する":"Search",
    "年":"Year","クール":"Season","冬":"Winter","春":"Spring","夏":"Summer","秋":"Fall",
    "すべて":"All","TV":"TV","劇場版":"Movie","OVA":"OVA","ONA":"ONA","特別編":"Special","Web":"Web","その他":"Other",
    "作品情報を読み込んでいます…":"Loading anime information…","データを読み込んでいます…":"Loading data…",
    "前へ":"Previous","次へ":"Next","1ページ目":"Page 1",
    "ホーム":"Home","作品データベース":"Anime Database","今期アニメ":"Seasonal Anime","ランキング":"Rankings","人物・団体":"People & Studios","コミュニティ":"Community"
  });
  /* Legal and source-page English translations */

  Object.assign(ja, {
    "プライバシーポリシー":"Privacy Policy","利用規約":"Terms of Service","最終更新日：2026年9月26日":"Last updated: September 26, 2026",
    "1. 基本方針":"1. Basic Policy","2. 取得する情報":"2. Information We Collect","3. 情報の利用目的":"3. Purposes of Use","4. アカウント情報について":"4. Account Information","5. レビューその他の投稿について":"5. Reviews and Other Posts","6. 外部サービスについて":"6. Third-Party Services","7. Cookie等について":"7. Cookies and Similar Technologies","8. 広告・アフィリエイトについて":"8. Advertising and Affiliate Programs","9. 個人情報の第三者提供":"9. Disclosure of Personal Information to Third Parties","10. 情報の管理":"10. Information Security","11. 利用者による情報の確認・変更・削除":"11. Reviewing, Changing and Deleting Your Information","12. 投稿内容の取り扱い":"12. Handling of User Content","13. 情報の保存期間":"13. Data Retention","14. 未成年者による利用":"14. Use by Minors","15. プライバシーポリシーの変更":"15. Changes to This Privacy Policy","16. お問い合わせ":"16. Contact",
    "第1条（適用）":"Article 1 (Scope)","第2条（サービス内容）":"Article 2 (Services)","第3条（アカウント）":"Article 3 (Accounts)","第4条（レビューその他の投稿）":"Article 4 (Reviews and Other Posts)","第5条（投稿内容の管理）":"Article 5 (Moderation of User Content)","第6条（禁止事項）":"Article 6 (Prohibited Conduct)","第7条（著作権等）":"Article 7 (Copyright and Other Rights)","第8条（投稿コンテンツの権利）":"Article 8 (Rights in User Content)","第9条（掲載情報について）":"Article 9 (Information on the Site)","第10条（外部サービス）":"Article 10 (Third-Party Services)","第11条（サービスの変更・停止）":"Article 11 (Changes to or Suspension of Services)","第12条（免責事項）":"Article 12 (Disclaimer)","第13条（利用制限・アカウント停止）":"Article 13 (Restrictions and Account Suspension)","第14条（規約の変更）":"Article 14 (Changes to These Terms)","第15条（準拠法）":"Article 15 (Governing Law)",
    "アカウント登録時に入力されたメールアドレス":"Email address provided when registering an account","プロフィールに登録されたユーザー名、表示名、 プロフィール画像、自己紹介等の情報":"Username, display name, profile image, bio and other profile information","お気に入りに登録したアニメ作品に関する情報":"Information about anime titles added to favorites","アニメ作品の視聴状況および視聴進捗に関する情報":"Information about viewing status and progress","アニメ作品に対して登録した評価":"Ratings submitted for anime titles","レビューの内容、タイトル、評価、 ネタバレ設定、投稿日時等":"Review content, titles, ratings, spoiler settings, posting dates and related information","レビューへの「いいね」に関する情報":"Information about likes on reviews","サービス利用時にブラウザ、端末等から送信される 情報":"Information sent by your browser, device or similar technology when using the service",
    "アカウントを作成・管理するため":"To create and manage accounts","ログインおよび認証機能を提供するため":"To provide login and authentication","プロフィール機能を提供するため":"To provide profile features","お気に入り機能を提供するため":"To provide favorites features","視聴状況および視聴進捗を管理するため":"To manage viewing status and progress","作品への評価機能を提供するため":"To provide anime rating features","レビュー機能を提供するため":"To provide review features","レビューへの「いいね」機能を提供するため":"To provide likes on reviews","サービスの運営、維持および改善のため":"To operate, maintain and improve the service","不正利用や迷惑行為への対応のため":"To address misuse and abusive behavior","サイトおよびサービスの安全性を維持するため":"To maintain site and service security",
    "他者を誹謗中傷する内容を投稿しないこと":"Do not post defamatory or abusive content about others","他者の個人情報を無断で投稿しないこと":"Do not post another person's personal information without permission","差別的、脅迫的または暴力的な内容を投稿しないこと":"Do not post discriminatory, threatening or violent content","法令または公序良俗に反する内容を投稿しないこと":"Do not post content that violates laws or public order and morals","第三者の著作権その他の権利を侵害する内容を 投稿しないこと":"Do not post content that infringes a third party's copyright or other rights","虚偽または他者を誤認させることを目的とする 内容を投稿しないこと":"Do not post false content or content intended to mislead others",
    "ANIXIA（以下「当サイト」といいます。）は、 利用者の情報を適切に取り扱い、個人情報の保護に 努めます。":"ANIXIA (the “Site”) handles user information appropriately and strives to protect personal information.",
    "利用者は、当サイトを利用することによって、 本規約に同意したものとみなされます。":"By using the Site, users are deemed to have agreed to these Terms.",
    "本利用規約（以下「本規約」といいます。）は、 ANIXIA（以下「当サイト」といいます。）が提供する サービスの利用条件を定めるものです。":"These Terms of Service (the “Terms”) set out the conditions for using the services provided by ANIXIA (the “Site”).",
    "当サイトでは、アニメ作品に関する情報、あらすじ、 評価、レビュー、ランキング、関連作品その他の情報を 提供しています。":"The Site provides information about anime, including synopses, ratings, reviews, rankings and related titles.",
    "当サイトでは、アカウント認証、データの保存その他の サービス提供のため、Supabase等の外部サービスを 利用しています。":"The Site uses third-party services, including Supabase, for account authentication, data storage and other service functions.",
    "当サイトでは、サービスの提供、運営、安全性の確保 その他必要な範囲で、以下の情報を取得する場合があります。":"The Site may collect the following information as necessary to provide and operate the service and maintain its security.",
    "取得した情報は、以下の目的で利用します。":"Collected information is used for the following purposes.",
    "利用者は、レビューその他のコンテンツを投稿する際、 以下の事項を遵守するものとします。":"When posting reviews or other content, users must comply with the following requirements.",
    "利用者は、当サイトの利用にあたり、 以下の行為をしてはいけません。":"Users must not engage in any of the following conduct when using the Site.",
    "当サイトでは、アニメ作品に関する情報を掲載していますが、 その内容について完全な正確性、完全性または最新性を 保証するものではありません。":"The Site publishes information about anime but does not guarantee that such information is entirely accurate, complete or up to date.",
    "最新の情報については、各作品の公式サイトその他の 正式な情報源をご確認ください。":"For the latest information, please check each title's official website or another authoritative source.",
    "本規約は、日本法に準拠して解釈されるものとします。":"These Terms shall be governed by and construed in accordance with the laws of Japan.",
    "← ホームへ戻る":"← Back to Home","アニメをもっと探しやすく、もっと楽しめる。":"Discover anime more easily and enjoy it more.",
    "データ出典・利用条件":"Data Sources & Terms","初期作品データ":"Initial Anime Dataset","初期登録作品":"Initially Registered Titles","キャラクター・声優":"Characters and Voice Actors","制作会社":"Animation Studios","人物・スタッフ":"People and Staff","公式キャラクター情報":"Official Character Information","公式スタッフ・キャスト情報":"Official Staff and Cast Information","配役確認先：":"Casting References:","公式出典：":"Official Sources:","公式作品情報":"Official Title Information","2006年TVアニメ追加作品":"Additional 2006 TV Anime","Wikidata自動収録候補の審査・公開（2026-11-17）":"Review and Publication of Automatically Collected Wikidata Candidates (November 17, 2026)",
    "ANIXIAは、作品情報の出典と利用条件を確認し、出典ごとに利用可能な情報だけを取り扱います。":"ANIXIA checks the sources and terms of use for anime information and handles only data permitted by each source.",
    "初期作品データに、Wikidataの構造化データを使用しています。Wikidataの構造化データはCC0で提供されています。出典表示は必須ではありませんが、データの出所としてWikidataを記載することが推奨されています。":"The initial anime dataset uses structured data from Wikidata. Wikidata's structured data is provided under CC0. Attribution is not required, but identifying Wikidata as the data source is recommended.",
    "Wikidataの作品候補はSupabase Edge Functionで毎日自動取得しています。取得した新規候補は非公開で保存し、管理者が「作品候補の審査」で対象作品・形式・情報の根拠を確認してから公開します。自動取得しただけで公開されることはありません。":"Anime candidates from Wikidata are collected automatically each day by a Supabase Edge Function. New candidates are stored privately and published only after an administrator reviews the title, format and supporting information. Automatic collection alone does not make a title public.",
    "Wikidataの情報は利用可能な構造化データに基づくものであり、情報の完全性・最新性をANIXIAが保証するものではありません。誤りや不足を確認した場合は、ANIXIA側でも修正・保留を行います。":"Wikidata information is based on available structured data. ANIXIA does not guarantee its completeness or currency and may correct or withhold information when errors or omissions are identified.",
    "ANIXIAが今回取り込んだのは、作品名・別名・放送開始日・話数・公式サイトURL・Wikidata識別子などの構造化情報です。Wikidata由来の画像・ポスター・バナー・あらすじ本文は取り込んでいません。":"The data imported by ANIXIA consists of structured fields such as titles, alternate titles, premiere dates, episode counts, official website URLs and Wikidata identifiers. Images, posters, banners and synopsis text from Wikidata were not imported."
  });

  /* Page-specific headings and controls */
  Object.assign(ja, {
    "アニメランキング":"Anime Rankings",
    "作品情報":"Anime Information",
    "タグ・テーマ":"Tags & Themes",
    "シリーズ":"Series",
    "関連作品":"Related Anime",
    "エピソード":"Episodes",
    "制作団体":"Production Organizations",
    "キャラクター":"Characters",
    "スタッフ":"Staff",
    "レビュー":"Reviews",
    "レビューを投稿":"Write a Review",
    "新しい作品と出会う":"Discover Something New",
    "最近の作品":"Recently Added",
    "ジャンルから探す。":"Browse by Genre",
    "ANIXIA管理画面":"ANIXIA Admin",
    "管理者権限がありません":"Administrator Access Required",
    "Annict作品データ同期":"Sync Annict Anime Data",
    "Wikidata自動作品収録":"Automatic Wikidata Anime Import",
    "Wikidataエピソード自動収録":"Automatic Wikidata Episode Import",
    "作品詳細データの同期":"Sync Anime Details",
    "作品画像の同期（Wikimedia Commons）":"Sync Anime Images (Wikimedia Commons)",
    "レビュー審査":"Review Moderation",
    "カタログ品質監視":"Catalog Quality Monitoring",
    "作品候補の審査":"Review Anime Candidates",
    "エピソード審査":"Episode Review",
    "作品メタデータ編集":"Edit Anime Metadata",
    "関連作品を登録":"Add Related Anime",
    "データ品質管理":"Data Quality Management",
    "作品の重複候補":"Potential Duplicate Anime",
    "メッセージ":"Messages",
    "会話を選択してください":"Select a conversation",
    "会話を選択すると、ここにメッセージが表示されます。":"Select a conversation to view messages here.",
    "ホーム":"Home",
    "作品データベース":"Anime Database",
    "今期アニメ":"Seasonal Anime",
    "ランキング":"Rankings",
    "人物・団体":"People & Studios",
    "コミュニティ":"Community"
  });

  /* Additional home, community, messaging and profile translations */
  Object.assign(ja, {
    "アニメを探す":"Find Anime",
    "作品名で検索":"Search by Title",
    "作品を収録":"Add Anime",
    "作品情報・詳細検索・関連作品":"Anime information, advanced search and related titles",
    "人気・評価から作品を発見":"Discover anime by popularity and ratings",
    "ユーザーの投稿・交流を見る":"Explore community posts and discussions",
    "作品知識に挑戦する":"Test your anime knowledge",
    "声優・スタッフ・登場人物・制作会社を探す":"Find voice actors, staff, characters and studios",
    "ランキングを見る →":"View Rankings →",
    "作品一覧 →":"All Anime →",
    "すべてのジャンル →":"All Genres →",
    "ユーザーの投稿を見る":"View Community Posts",
    "ユーザーの感想を読む":"Read User Reviews",
    "ログインするとブックマークを利用できます。":"Log in to use bookmarks.",
    "ブックマークはありません。":"No bookmarks yet.",
    "まだ投稿がありません。":"No posts yet.",
    "コミュニティを読み込めませんでした。":"Could not load the community.",
    "再読み込み":"Reload",
    "引用投稿":"Quote Post",
    "返信":"Reply",
    "削除":"Delete",
    "キャンセル":"Cancel",
    "検索できませんでした。":"Search failed.",
    "ユーザーが見つかりません。":"No users found.",
    "ログインが必要です。":"Login required.",
    "探す":"Discover",
    "会話を読み込み中…":"Loading conversations…",
    "まだ会話はありません。":"No conversations yet.",
    "上の検索からユーザーを選択してください。":"Select a user from the search above.",
    "会話はありません。":"No conversations.",
    "メッセージを読み込めませんでした。":"Could not load messages.",
    "メッセージを読み込み中…":"Loading messages…",
    "メッセージはありません。":"No messages yet.",
    "グループ作成中：検索結果から複数人を選択してください。":"Creating a group: select multiple people from the search results.",
    "画像なし":"No image",
    "プロフィールを編集":"Edit Profile",
    "自己紹介はまだありません。":"No bio yet.",
    "公開されている項目はありません。":"No public items.",
    "公開されている作品はありません。":"No public anime titles.",
    "投稿を開く":"Open Post",
    "公開されている投稿はありません。":"No public posts.",
    "公開されている個人ランキングはありません。":"No public personal rankings.",
    "公開されているレビューはありません。":"No public reviews.",
    "ユーザーはいません。":"No users.",
    "この項目を取得できませんでした。":"Could not retrieve this item.",
    "プロフィールIDが指定されていません。":"No profile ID was specified.",
    "プロフィールを取得できませんでした。":"Could not retrieve the profile.",
    "クイズを読み込んでいます…":"Loading quizzes…",
    "クイズが見つかりませんでした。":"No quizzes found.",
    "作品を比較する":"Compare Anime",
    "作品を検索":"Search Anime",
    "作品名を入力して検索してください。":"Enter an anime title to search.",
    "選択した作品を比較":"Compare Selected Anime",
    "2〜3作品を選択すると比較結果を表示します。":"Select 2–3 titles to view a comparison.",
    "アニメを発見する":"Discover Anime",
    "ジャンルや人気作品から、次に観たいアニメを探しましょう。":"Find your next anime by exploring genres and popular titles.",
    "ジャンルを読み込んでいます…":"Loading genres…",
    "人気の作品":"Popular Anime",
    "作品を読み込んでいます…":"Loading anime…",
    "最近の作品":"Recently Added",
    "すべての作品 →":"All Anime →",
    "詳細検索 →":"Advanced Search →",
    "メッセージ":"Messages",
    "プロフィール":"Profile",
    "フォロワー":"Followers",
    "フォロー中":"Following",
    "レビュー":"Reviews",
    "投稿":"Posts",
    "公開されている作品はありません。":"No public anime titles.",
    "ログイン":"Log in",
    "マイページ":"My Page",
    "作品比較":"Compare Anime",
    "おすすめ診断":"Recommendations",
    "今期":"Season",
    "人物・団体":"People & Studios",
    "作品検索":"Anime"
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

/* Cache revision 4: expanded core-page translations. */

/* Cache revision 5: legal/source page translations. */

/* Cache revision 6: page-specific heading translations. */

/* Cache revision 7: community, messaging and profile translations. */

/* Cache revision 8: retry-safe all-page retrofit. */
