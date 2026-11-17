# ANIXIA Catalog Curation

Updated: 2026-11-17

## Admin access

Open `admin.html` after signing in with an ANIXIA administrator account. The page checks the signed-in user through the server-side `is_anixia_admin()` RPC. Non-admin users cannot access the management functions through the database policies.

## Metadata editor

1. Select the anime work.
2. Choose one or more genres and tags. Use genres for broad classifications and tags for more specific themes or attributes.
3. Select `ジャンル・タグを保存`.
4. To add a new dictionary entry, enter its Japanese display name and use the genre or tag add button. The new item is added to the dictionary; select it on the work and save the assignment separately.

The assignment is saved by `admin_replace_anime_taxonomy` in a single database transaction. It checks administrator permissions, verifies the work and all supplied genre/tag IDs, and then replaces the existing associations.

## Related works

Select a work, select a second work, choose the relation type, and save. Available relation types include sequel, prequel, side story, spin-off, alternative version/remake, summary, parent story, adaptation, and other.

Relations are directional. Add the appropriate reciprocal relation separately only when it is factually appropriate. The public detail endpoint shows both outgoing and incoming links between published works.

## Data quality checklist

The admin page flags missing title, format, release year, synopsis, official website URL, and genre assignment for unpublished works. These flags are a review aid, not an automatic publish decision. Confirm source accuracy, Japanese-original-work eligibility, supported format, age/content scope, and rights before publication.

## Public detail page

The public detail RPC returns:
- Genres and tags
- Alternate titles
- Published episodes only
- Series membership
- Studios and production organizations
- Related works, filtered to published works
- Existing character, staff, and published review information

Episodes imported from Annict remain unpublished by default. They do not appear on public detail pages until separately reviewed and published.

## Current verification limits

The schema, grants, and RLS policies have been checked. At the time of implementation, the catalogue tables checked contained no populated anime records. Therefore, end-to-end verification with actual works, browser interaction, and visual review still need to be performed once approved source data is available.

## Episode moderation

Open the episode review queue in `admin.html`. Each imported episode is listed with its parent work, episode number, title, source, air date, and synopsis when available. Review the relationship and information before selecting `確認して公開`. Publication is per episode; the parent anime's publication status is not changed.


## Annict候補プレビューとページ継続
- 「取得候補をプレビュー」は、承認済み・有効化済みのデータソースに限り、指定ページの候補を読み取ります。ANIXIAのデータベースには保存しません。
- プレビューでは作品名、Annict ID、元のメディア表記、ANIXIA側の形式候補、放送年・シーズン、話数、公式URL、登録済み・公開済み状態を確認できます。
- 「同期を開始」は候補を非公開状態で登録・更新します。結果が partial で次ページが返された場合、「次のページから続行」を押すと、そのページから続けられます。
- プレビューも同期も、サーバー側で管理者認証とデータソースの承認・有効状態を確認します。利用条件の確認が完了するまでAnnictは無効のままにしてください。
- 現在、ページ継続に対応するのは作品基本情報です。作品詳細（エピソード・キャスト・スタッフ）の4ページ超の継続取得は未実装であり、上限超過時は安全のため書き込みを停止します。


## 作品詳細同期のページ継続
- Annict作品IDを指定し、エピソード・キャスト・スタッフそれぞれの開始ページを設定して同期します。
- 1回の実行で各コレクションを1ページ（最大50件）ずつ取得します。次ページが存在するコレクションだけカーソルが進みます。
- 次ページがないコレクションのページ番号は0になります。0は「取得完了・スキップ」を意味します。ほかのコレクションの続きがある場合は「続きから同期」を押してください。
- 同じページを再実行しても、Annictの外部IDをキーにupsertする設計です。ただし、実データを使った重複・整合性テストは未実施です。
- エピソード種別はAPI情報だけで通常話と断定できないため、初期値を「不明」にしています。公開前に管理者が確認してください。

## Annict作品形式の対応
- Annict公式Works APIのmedia値は `tv` / `ova` / `movie` / `web` / `other` です。
- `web` は `web` として保持し、ONAと自動判定しません。`other` もそのまま保持します。
- APIのmedia値だけでは `special` や `ona` を確定できないため、公開前の編集・別の根拠による確認が必要です。


## 管理者向けデータ品質レポート
管理画面の「データ品質管理」から、公開・未公開の作品と登録済みエピソードを検査できます。

検出項目：
- 作品名、あらすじ、公開・放送時期、公式サイトURL、ジャンル、制作会社の不足
- 公式サイトURLの形式不正、公開年の不自然な値
- 正規化タイトルが一致する重複候補（続編・リメイク等の別作品の可能性があるため、自動統合しない）
- 作品の話数情報と登録済みエピソード件数の不一致、エピソード未登録
- エピソード種別が「不明」のまま、エピソードタイトルの不足

重大・警告・参考の区分と件数を表示します。レポートは読み取り専用で、作品やエピソードの修正・公開状態変更は行いません。重複候補は必ず人が確認してください。

品質レポートRPCは管理者チェックをサーバー側で行い、匿名ロールからの実行権限を取り消しています。管理画面からの実データ検証は、作品データ投入後に行ってください。カタログが空の場合は、検査未実施であることを画面に表示します。


## 重複候補の比較・統合
管理画面の「重複候補・名称統合」で、人物・キャラクター・制作会社・組織の候補を確認できます。

- 日本語名、かな名、英語名、ニックネーム、統合時に保存した別名を照合します。
- ひらがな・カタカナ、空白・一部の句読点差は正規化して比較します。
- 完全一致（正規化後）の候補だけを表示します。曖昧一致や翻字推定は行いません。
- 比較画面には一致名称、関連作品数、外部IDを表示します。
- 左または右のどちらを残すか管理者が選び、確認ダイアログに同意した場合のみ統合します。
- 統合対象は人物・キャラクター・制作会社・組織です。アニメ作品そのものは対象外です。
- 作品・人物・キャラクター・制作会社・組織の関連付けと外部IDを移します。重複する関連付けは整理します。
- 同一データ提供元の外部IDが競合する場合は統合を中止し、データを変更しません。
- 統合元の名称は別名として保存します。統合先の既存の正式名称は維持します。

名称一致は同一性の証明ではありません。声優の同姓同名、別会社、別キャラクター等の可能性を確認してから操作してください。統合は取り消せないため、実データを投入した後に少数の検証データで十分に確認してから運用してください。


### 統合時の追加保護
- 特権処理本体は非公開の `private` スキーマに配置し、公開RPCは `SECURITY INVOKER` の薄い呼び出し口にしています。内部関数にも管理者チェックを残しています。
- 統合先に情報がある項目は維持し、空欄だけを統合元の情報で補完します。人物のプロフィール、キャラクターの説明・シリーズ、制作会社・組織のWeb情報も対象です。
- 統合対象の行はUUID順でロックします。
- ひらがな・カタカナは濁音・半濁音を含めて正規化します。長音記号は削除せず、異なる名前が誤って一致する可能性を抑えます。


## 別名を使った検索
- 作品一覧のメイン検索欄では、作品の別タイトルに加えて、声優・スタッフ、キャラクター、制作会社、組織の名称と統合済み別名から作品を検索できます。
- 「声優・スタッフ」と「キャラクター」の個別検索欄も、統合済み別名を照合します。
- 同じ作品に複数の検索一致があっても、作品カードは1件だけ表示されます。
- 別名テーブル自体は公開REST APIから直接読めません。公開済み作品を対象とする検索RPC内で照合します。
- 別名は重複統合時に保存された名称が中心です。すべての略称・通称を自動収集する機能ではありません。
