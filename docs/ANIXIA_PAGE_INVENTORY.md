# ANIXIA ページ・機能棚卸し

調査日: 2026-11-21
対象: main ブランチ

## リポジトリ構成の実測
- ルートHTMLページ: 35
- 作品詳細の生成HTML: 8,431
- ジャンル詳細の生成HTML: 26
- CSS: 5ファイル
- JavaScript: 29ファイル
- SQLファイル: リポジトリ内では確認できず（Supabase側の現行スキーマ・RLSは別途監査が必要）

## ルートページ一覧

### 作品データベース・発見
- index.html — ホーム
- anime.html — 作品一覧・検索
- anime-detail.html — 作品詳細
- discover.html — 作品発見
- season.html — 今期アニメ
- ranking.html — ランキング
- genres.html — ジャンル一覧
- entities.html — 人物・キャラクター・制作会社
- entity-detail.html — 人物・団体詳細

### ユーザー・個人ライブラリ
- login.html — ログイン
- signup.html — 新規登録
- auth-callback.html — 認証コールバック
- verify-email.html — メール認証
- forgot-password.html — パスワード再設定メール
- reset-password.html — パスワード再設定
- mypage.html — マイページ
- profile.html — プロフィール
- user-search.html — ユーザー検索
- messages.html — メッセージ

### コミュニティ・参加型機能
- community.html — コミュニティ
- compare.html — 作品比較
- quiz.html — クイズ一覧
- quiz-play.html — クイズプレイ
- recommendations.html — おすすめアニメ診断
- memo.html — メモ

### 管理・情報・補助
- admin.html — 管理画面
- admin-login.html — 管理者ログイン
- admin-dashboard.html — 管理ダッシュボード
- admin-candidates.html — 作品候補審査
- data-sources.html — データ出典
- terms.html — 利用規約
- privacy.html — プライバシーポリシー
- operator.html — 運営情報
- screen-design.html — 画面デザイン基準
- feature-prototypes.html — 機能プロトタイプ

### 生成ページ
- anime/{id}/index.html — 作品ごとの詳細ページ（8,431件）
- genre/{id}/index.html — ジャンルごとの詳細ページ（26件）

## 共通アセット
### CSS
- site-theme.css
- anixia-unified-theme.css
- anixia-screen-system.css
- header.css
- style.css

### JavaScript
- anime-data.js
- anixia-admin.js
- anixia-anime.js
- anixia-auth-pages.js
- anixia-client.js
- anixia-compare.js
- anixia-detail.js
- anixia-diagnosis.js
- anixia-discover.js
- anixia-forgot-password.js
- anixia-genres.js
- anixia-global-header.js
- anixia-home.js
- anixia-i18n.js
- anixia-mypage.js
- anixia-name-audit.js
- anixia-quiz-list.js
- anixia-quiz-play.js
- anixia-ranking.js
- anixia-search-suggest.js
- anixia-season.js
- auth-core.js
- auth-nav.js
- auth-required.js
- discover.js
- entities.js
- entity-detail.js
- performance.js
- sw.js

## 初期監査で確認した事項
1. feature-prototypes.html を除く34のルートページで、共通ヘッダー用スクリプトと統一テーマCSSの読み込みを確認した。
2. 既存ページごとにヘッダー・フッターのHTML有無が異なる。共通スクリプトが既存ヘッダー／フッターを置換して統一する設計のため、ページ固有要素の消失がないか引き続き検証する。
3. 画面デザインシステムCSSの直接読み込みは一部ページに限られていた。2026-11-21の変更で、共通ヘッダースクリプトから全対象ページへ共通CSSを追加読み込みするようにした。
4. 共通フッターは固定表示の要件を維持する。2026-11-21の変更で、PC・タブレット・スマートフォン向けにコンパクトな固定フッターへ整理し、リンクを横スクロール可能にし、フッター実寸に応じて本文下部の余白を動的に確保するようにした。
5. 統一テーマCSSのbody初期余白は上部0px・下部32pxとし、共通スクリプトがヘッダーとフッターの実寸に合わせて余白を設定する。
6. ホームとシーズン一覧は sort:"popular" を指定している。フロントエンドはSupabase RPC search_public_anime にソート条件を渡しているが、人気順のSQL定義はリポジトリ内で確認できない。外部API由来の人気度を使っていないことをDB側で確認する必要がある。
7. GitリポジトリにSQL migrationが見当たらないため、Supabaseの現行スキーマ、RLS、RPC、Auth設定は未監査。変更を加える前に別途確認する。

## 次の監査・改修項目
- 全ページのリンク先存在確認（相対URL・クエリ付きURLを含む）
- 共通ヘッダーのナビゲーションと実ページ導線の照合
- 認証状態別のログイン／マイページ／ログアウト表示
- 作品画像の欠損時フォールバック、遅延読み込み、alt
- 作品一覧のフィルター・ソート・ページネーション
- 作品詳細のシリーズ・人物・制作会社・関連作品リンク
- 視聴状態・話数進捗・評価・お気に入り・レビューの保存とRLS
- クイズ／診断／コミュニティ／メッセージの空状態・エラー状態
- PC・タブレット・スマートフォンの幅別表示
- キーボード操作、フォーカス、ラベル、コントラスト
- Supabaseスキーマ・RLS・RPC・Auth・Storageの確認
- 外部APIから人気度を取得していないことの確認

## 検証上の制約
この棚卸しはGitHub上のファイル構成とHTML/CSS/JSの静的確認に基づく。全画面の実ブラウザ表示、ログインを伴う実操作、Supabaseデータの更新、スマートフォン実機表示はこの段階では検証していない。未検証の項目を完了扱いにしない。
