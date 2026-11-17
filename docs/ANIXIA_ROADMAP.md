# ANIXIA 開発ロードマップ・初回監査

更新日: 2026-11-17  
対象リポジトリ: https://github.com/The-Rascal-of-Sakurasou/anixia  
公開サイト: https://the-rascal-of-sakurasou.github.io/anixia/

## 1. プロダクト方針

ANIXIAは、日本向けアニメ総合プラットフォームを目指す。

- アニメ大全: 国内作品情報の網羅性・日本語情報設計を参考にする。
- MyAnimeList: 作品詳細、視聴管理、評価、ランキング、レビュー、ユーザー体験を参考にする。
- ANIXIA独自: 日本語検索、診断、クイズ、作品比較、国内向け情報整理を強化する。

両サービスの画面・情報設計を研究対象とし、データ、文章、画像、ロゴ等を許諾なく転載しない。

## 2. 優先順位

### P0 — 開発着手前・公開前に必須
1. データソースの利用条件、保存・表示・再配布・画像利用条件を確定する。
2. 公開RPC、RLS、管理者権限、Edge Functionの認可を監査する。
3. 作品の収録基準、重複排除、作品ID、続編・シリーズの扱いを確定する。
4. 作品データの取得・検証・承認・公開・更新のフローを構築する。
5. バックアップ、復旧、同期失敗時の再実行手順を定める。

### P1 — コアサービス
6. 作品データベース（基本情報、別名、形式、放送情報、話数、あらすじ）。
7. 関連情報（エピソード、ジャンル、テーマ、制作会社、スタッフ、声優、キャラクター、シリーズ・関連作品）。
8. 検索・詳細検索・並び替え・ページネーション。
9. 作品詳細ページと関連情報の導線。
10. 日本語／英語の共通ナビゲーションと共通ページ構造。

### P2 — ユーザー機能
11. アカウント・プロフィール。
12. 視聴状態・話数進捗・お気に入り・個人評価。
13. 視聴統計・マイライブラリ。

### P3 — コミュニティ・発見
14. 評価集計・ランキング。
15. レビュー・コメント・通報・モデレーション。
16. おすすめ診断・作品比較・投票。
17. アニメクイズ・アニソンイントロクイズ。

### P4 — 公開品質と成長
18. SEO・サイトマップ・構造化データ。
19. モバイル・タブレット・PCの表示検証。
20. アクセシビリティ・速度・障害対応・セキュリティ再監査。
21. 利用状況を見ながら改善し、データと機能を継続拡充する。

共通デザイン、セキュリティ、アクセシビリティ、レスポンシブ対応は最後にまとめて行うのではなく、各フェーズで継続的に適用する。

## 3. 2026-11-17 時点の確認済み現状

### GitHub / フロントエンド
- GitHub Pagesを使用。
- HTML / CSS / JavaScriptを中心とした構成。
- `site-theme.css` に共通デザイン基盤がある。
- トップページには日本語／英語切替があるが、確認した検索・ランキング・マイページ・作品詳細ページでは同等の切替・ナビゲーションが統一されていない。
- 作品検索はタイトル、ジャンル、年、クール、形式、制作会社、並び順を扱う画面がある。
- ランキングは評価、人気、レビュー数、新着の切替がある。
- 作品詳細にはキャラクター、スタッフ、レビュー、マイライブラリの領域がある。
- サイトマップにはホーム、作品検索、ランキング、比較、今期、ジャンル、発見、および生成ジャンルページが含まれる。

### Supabase
- ANIXIA専用プロジェクト `trvnxggqzlhqdhoyiliy` は ACTIVE_HEALTHY。
- PostgreSQL 17、東京リージョン。
- 2026-11-17時点で、確認した public/private の26テーブルはすべて0行。
- 基本テーブルとして anime / genres / tags / studios / people / characters / anime_staff / anime_characters / anime_genres / anime_tags がある。
- ユーザー機能として profiles / watch_entries / favorites / ratings / reviews / achievements / user_achievements がある。
- クイズ機能として quizzes / quiz_questions / quiz_choices / quiz_attempts / quiz_answers と private.quiz_answer_keys がある。
- `episodes`、シリーズ、作品間関係を独立管理するテーブルは現行一覧で確認できていない。必要性と正規化を設計時に検討する。
- RLSは確認した全テーブルで有効。
- 作品の公開読取は複数の SECURITY DEFINER RPC を通す設計。公開RPCは `is_published = true` を条件にしているが、anon/authenticatedから実行できるため、公開対象・返却項目・大量取得耐性を公開前に再監査する。
- クイズ採点関数は直接のanon/authenticated実行権限がなく、JWT検証付きEdge Function経由で呼び出す構成。
- SECURITY DEFINERに関するSupabase Advisor警告がある。すべてを機械的に削除せず、公開APIとして必要な関数と管理用関数を分けて、権限・入力検証・返却範囲を確認する。
- 旧式の `annict-sync` Edge Functionも有効状態で、verify_jwt=false。関数内に独自インポートキー検証がある。利用箇所と必要性を確認するまで停止・削除しない。

### 現在のAnnict同期
- `sync-annict-catalog` はJWT検証を有効化し、ログインユーザー確認とANIXIA管理者判定を行う。
- 現行同期処理は作品基本情報を中心に `anime` へupsertする。
- 現行処理では、エピソード、キャスト、スタッフ、キャラクター、ジャンル、制作会社との関連付けを十分に同期していない。
- そのため、作品基本情報の同期だけでアニメ大全相当の詳細DBが完成するわけではない。

## 4. データソース方針と注意

### Annict
現行READMEの第一候補。API利用規約は2026-11-25施行予定（2026-11-17時点）。

確認事項:
- API利用は無料。規約を守る限り商用・非商用で利用可能。
- 作品情報はアプリ内表示のために保存・キャッシュでき、保存期間・件数の上限は規約上設けられていない。
- 取得データをそのまま、または一括データとして第三者が取り出せるように再提供することは禁止。公開リポジトリや誰でも取得できるデータダンプも避ける。
- 作品情報の画像URLについて、Annictが画像の権利を許諾しているわけではない。画像の再配布・改変・データセット化は行わず、権利と表示方法を個別に確認する。
- API提供元で作品情報が訂正・統合・削除される可能性があるため、定期再取得と差分反映を設計する。
- 作品・エピソード・キャスト・キャラクター・シリーズ等のAPIを個別に調査し、テーブルに正規化する。
- Annict APIだけで不足するジャンル、制作会社、詳細なあらすじ等は、別の適法なデータソースまたは編集・確認フローで補完する。

公式資料:
- https://annict.com/terms/api
- https://developers.annict.com/docs/rest-api/v1
- https://docs.annict.com/docs/ja/api/v1/works
- https://developers.annict.com/docs/rest-api/v1/episodes
- https://developers.annict.com/docs/rest-api/v1/characters
- https://docs.annict.com/docs/ja/api/v1/casts

### MyAnimeList / アニメ大全
- 主に画面設計、情報設計、ユーザー体験の参考とする。
- 公式API・データの利用は、開発者登録、契約、利用規約、再配布・保存条件を確認してから別途判断する。
- Webページのスクレイピングや作品画像・説明文のコピーを前提にしない。
- 両サービスからの無断データ一括取得は行わない。

### 未確定の補完データソース
Jikan、TMDB、オープンデータ、公式サイト、権利者提供情報等は、名称だけで採用を決めない。利用条件、カバレッジ、更新頻度、IDの対応、画像権利、再配布条件、費用を比較してから決定する。

## 5. 次の実施順

1. 全ページ・全スクリプト・全Edge Functionの機能一覧を確定する。
2. Supabaseの全テーブル・制約・インデックス・ポリシー・RPCを棚卸しする。
3. 公開SECURITY DEFINER RPCと旧Annict同期関数の必要性・権限を監査する。
4. Annict APIの各エンドポイントと規約に合わせたデータ項目マッピングを作る。
5. 収録対象・除外対象・リメイク・続編・OVA/ONA/SPECIALのルールを確定する。
6. 作品・エピソード・人物・キャスト・スタッフ・ジャンル・制作会社・シリーズのデータモデルを確定する。
7. 小規模なテストデータで同期・重複排除・公開・検索を検証してから本格同期する。
8. その後に全ページの共通UIとコア機能を段階的に接続する。

## 6. 変更管理原則

- 既存データ・既存機能を不用意に削除しない。
- 本番DBへの破壊的変更はバックアップ・影響範囲・ロールバック方法を確認してから行う。
- まず読み取り監査と小さな検証を行い、成功を確認してから本番変更する。
- APIキー、サービスロールキー、アクセストークン等の秘密情報をGitHubやブラウザに置かない。
- 実機確認・テスト・デプロイが完了していない機能を完成扱いにしない。
- 月額0円を目標とし、無料枠の制限と将来の課金条件を確認する。


## 7. 2026-11-17 implementation progress

### Completed and applied to the active Supabase project
- `202611170001_catalog_expansion.sql`: alternate titles, episodes, studio links, work relations, external IDs, and source registry.
- `202611170002_metadata_relationships.sql`: richer people/character/studio fields, series, organizations, and organization staff.
- `202611170003_catalog_rls_visibility.sql`: catalogue dictionaries and relationship rows restricted to published works; administrator read access retained.
- `202611170004_restrict_internal_catalog_privileges.sql`: anonymous table privileges revoked from internal source-ID and source-rights tables.
- `202611170005_provider_identity_columns.sql`: stable provider identity fields for imported entities.
- `202611170006_upsert_conflict_indexes.sql`: non-partial unique indexes for PostgREST upsert conflict targets.

All 6 migration files are present in the repository and applied to the active Supabase project. The project migration history records these changes.

### Validation observed
- New catalogue tables have RLS enabled.
- Anonymous access to internal external-ID and source-rights tables is revoked.
- Public catalogue dictionaries are restricted to entities linked to published works.
- The current anime, episode, people, character, studio, series, and organization tables still contain 0 records; no bulk import has been run.
- Annict remains `rights_review_status='pending'` and `is_enabled=false`. Production imports remain disabled pending the 2026-11-25 API-terms effective date and final operating review.

### Next implementation tasks
1. Complete the Annict field-by-field importers for episodes, casts, staff, characters, organizations, studios, and series.
2. Add import validation, duplicate reports, and admin review before publication.
3. Test one approved sample work end-to-end before running any catalogue-wide import.
4. Extend the front-end detail page to display episodes, multiple studios, series, cast, staff, and related works.
5. Evaluate a Japanese-aware search strategy before scaling the catalogue.


### Annict detail importer implementation
- Added `supabase/functions/sync-annict-work-details/index.ts`.
- Deployed as Supabase Edge Function `sync-annict-work-details`, active version 3, with JWT verification enabled.
- Requires a valid signed-in ANIXIA administrator and checks `catalog_sources` for Annict `rights_review_status='approved'` and `is_enabled=true` before any Annict API request.
- Accepts one Annict work ID at a time. Fetches episodes, casts, and staff sequentially with pagination capped at four pages per endpoint and retry handling for rate limits / temporary server errors.
- Upserts episode, person, character, organization, studio, and series entities using provider identifiers; links the records to the ANIXIA work and records cross-reference IDs.
- Imported episodes remain unpublished; the importer does not publish the anime or its related records.
- Omits Annict image URLs and does not import user profiles, viewing records, or reviews.
- End-to-end API import has not been run. The Annict source is still `pending` and disabled, so the importer is intentionally blocked until the terms review is completed.
- The current importer does not yet fill genres/tags, sequel/prequel relations, episode synopses, or episode duration. Those require separate mapping/source validation.


### Catalog curation and public detail expansion (2026-11-17)
- Added migration `202611170007_catalog_taxonomy_admin.sql`: admin-only write policies for genres, tags, and anime taxonomy joins; reverse lookup indexes; transactional taxonomy replacement RPC.
- Added migration `202611170008_public_anime_detail_expansion.sql`: public detail RPC now returns tags, alternate titles, published episodes, series, studios, organizations, and published related works in addition to existing metadata.
- Added migration `202611170009_harden_taxonomy_rpc.sql`: hardened the taxonomy RPC with an empty search path and schema-qualified object references.
- Extended `anixia-client.js` with admin catalogue, taxonomy, and relation methods.
- Extended `admin.html` and `anixia-admin.js` with genre/tag assignment, dictionary creation, relation editing, and a missing-field quality checklist.
- Extended `anime-detail.html` and `anixia-detail.js` to display tags, series, related works, published episodes, and production organizations.
- Database checks confirm the taxonomy RPC exists, authenticated users have execute permission, anonymous users do not, and four admin-only write policies are present.
- No production anime data is currently available in the tables checked, so populated-record UI and end-to-end browser testing remain pending. Do not describe the new screens as fully field-tested.


### Episode review and anonymous privilege hardening (2026-11-17)
- Added an admin episode moderation queue to `admin.html` and `anixia-admin.js`. Imported episodes remain private until individually reviewed and published.
- Added `listPendingEpisodes` and `setEpisodePublished` to the browser client.
- Corrected the embedded anime relationship in the pending-episode query to use the actual `episodes_anime_id_fkey` constraint.
- Security review found inherited anonymous write grants on catalogue tables. Migration `202611170010_revoke_anon_catalog_writes.sql` removes INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER privileges for `anon` on genres, tags, anime taxonomy joins, anime relations, alternate titles, episodes, studios, series, and production organizations. RLS policies remain in place.
- Post-migration checks confirmed anonymous INSERT/UPDATE/DELETE privileges are false for all 12 checked catalogue tables.


### Advanced public catalogue search (2026-11-17)
- Added migration `20261117125000_advanced_catalog_search.sql` and deployed the 12-argument `search_public_anime` overload. The existing 9-argument overload remains available for compatibility with older pages.
- The expanded RPC searches primary titles, kana titles, and `anime_titles` alternate-title records; it also filters by multiple tags, production studios (including linked secondary studios), staff/voice-actor names, and character names.
- The new RPC returns published anime only, caps result size at 50, caps title/person/character search terms at 80 characters, and limits tag filtering to the first 30 supplied IDs.
- Explicitly revoked the default PUBLIC execute grant and granted execution only to `anon`, `authenticated`, and `service_role`; the function uses an empty search path and schema-qualified objects.
- Updated `anixia-client.js`, `anime.html`, and `anixia-anime.js` with tag multi-select, staff/person search, character search, URL-preserved filters, and a reset control.
- Direct database invocation with empty filters succeeded and returned 0 rows, as expected because the anime table is currently empty. Function grants and the empty search_path were verified.
- Browser/API end-to-end testing with real anime data remains pending. The UI cannot demonstrate the new filters until tags and anime records are populated.
- Supabase Advisor still flags public-facing SECURITY DEFINER RPCs because anonymous execution is intentional for public catalogue access. These functions must continue to enforce published-only output and bounded inputs. The admin taxonomy RPC retains its in-function administrator check.
