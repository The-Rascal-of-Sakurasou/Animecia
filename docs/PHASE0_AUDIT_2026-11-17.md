# ANIXIA Phase 0 現状監査

確認日：2026-11-17  
対象：GitHub `main`、ANIXIA Supabaseプロジェクト  
目的：既存資産を壊さず、正式公開に向けた最初の開発順序を確定する。

## 1. 確認できた構成

- GitHubリポジトリ：`The-Rascal-of-Sakurasou/anixia`（public、default branch: `main`）
- フロントエンド：GitHub Pages、HTML/CSS/JavaScript
- 新Supabase：`anixia`、東京リージョン、状態 `ACTIVE_HEALTHY`
- 新Supabase：public/private 合計26テーブル。確認時点で各テーブルの行数は0。
- 新Supabase：適用済みマイグレーション履歴は10件。
- リポジトリ：SQLファイル42件。そのうちANIXIA用の2026-11-17マイグレーションは5件。DBに適用済みの初期5マイグレーションはリポジトリ内で確認できず、再現可能なスキーマ履歴に差がある。
- リポジトリには作品別の静的SEOページ、共通CSS、認証・検索・視聴管理・ランキング等の既存実装がある。全面作り直しではなく、既存資産を監査して段階移行する。

## 2. 公開ページとSupabase接続の不整合

新しい共通クライアント `anixia-client.js` は新ANIXIAプロジェクトを参照している。一方、次の21ページでは旧Animecia Supabaseプロジェクトへの直接参照が残っていることを確認した。

- `admin-candidates.html`
- `admin-dashboard.html`
- `admin-login.html`
- `auth-callback.html`
- `community.html`
- `compare.html`
- `discover.html`
- `genres.html`
- `login.html`
- `memo.html`
- `messages.html`
- `mypage.html`
- `profile.html`
- `quiz-play.html`
- `quiz.html`
- `ranking.html`
- `recommendations.html`
- `reset-password.html`
- `season.html`
- `signup.html`
- `user-search.html`

旧Animecia Supabaseプロジェクトは `INACTIVE`。したがって、これらのページをURLだけ新プロジェクトに置換してはならない。旧ページが利用するテーブル・RPC・認証処理と新スキーマを照合し、ページ単位で移行する。

## 3. 自動処理とデータソースの不整合

AniListを取得・分類・補完に使用する自動ワークフローが複数残っていた。READMEの「AniListは新規データ取得に採用しない」という方針と整合しない。該当するAniList依存ワークフロー13件と、旧プロジェクト／旧スキーマ依存の3件は、この開発ブランチで有効なワークフロー一覧から削除した。Gitの履歴には残る。

旧スキーマ依存の3件：
- `anime-cover-refresh.yml`：停止中の旧Supabaseプロジェクトを直接呼び出す。
- `anime-official-image-repair.yml`：旧スキーマのカラムを前提にしている。
- `anime-sitemap.yml`：旧ビュー `animecia_public_anime` と旧カラムを参照する。さらに生成処理は既存の作品別SEOページ・サイトマップを削除・再生成し、ワークフローはmainへ自動pushする。新DBが空の状態で実行すると、既存SEO資産を失う危険がある。

SEO生成スクリプト自体は旧スキーマ参照のままなので、新スキーマ対応と保護テストが完了するまでワークフローを再導入しない。Annict等の利用条件を確定するまではAniListの自動取得も再導入しない。

## 4. Supabase監査

- 26テーブルすべてでRLSが有効。
- Security AdvisorはRLSポリシーがないテーブル4件をINFOとして報告。対象には、公開RPC経由で公開済み作品だけを返す設計の `public.anime`、同期ログ、privateスキーマの管理者・クイズ正解テーブルが含まれる。ポリシーがないことだけで直ちに脆弱性とは判断しない。
- 公開作品検索・詳細・おすすめ等の4 RPCはSECURITY DEFINERとして警告される。確認した定義では `is_published = true` に限定し、空のsearch_pathを設定している。公開範囲と権限を継続レビューする。
- Performance Advisorは外部キーの未インデックス10件を報告。未使用インデックス18件も報告するが、DBがほぼ未使用のため、使用状況を測定せず削除しない。

## 5. 次の実装順序

1. 旧・不整合な自動ワークフローを停止する（このブランチで実施）。
2. 新ANIXIAスキーマの初期マイグレーションをGit管理下に戻し、DBとリポジトリの差をなくす。
3. 共通Supabaseクライアント・認証・権限の接続方式を統一する。
4. 旧プロジェクト参照が残る21ページを、画面の機能と新テーブル/RPCの対応表に基づいて移行する。単純なURL置換はしない。
5. Annict等のデータソースについて、保存・キャッシュ・画像・再配布・商用利用条件を確定し、秘密情報をサーバー側だけに置く同期処理を実装する。
6. 初回作品データを投入し、件数・重複・出典・公開状態を検証する。
7. 検索・作品詳細・視聴管理・ランキングを実機テストする。
8. SEO生成処理を新スキーマに合わせて作り直し、既存SEOページを保護するテストを追加する。

## 6. 受け入れ条件

- 公開ページが停止中の旧Animecia Supabaseを参照しない。
- DBの初期構築から全マイグレーションを新規環境で再現できる。
- 公開データとユーザー個人データの権限境界をテストできる。
- 外部データの出典・利用条件・更新日時を追跡できる。
- 既存の静的SEOページを誤って削除しない。
- 空データ・API障害・未ログイン状態でも各画面が破綻しない。
