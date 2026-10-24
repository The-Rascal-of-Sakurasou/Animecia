# Animecia 現状調査レポート（2026-10-24）

## 調査範囲
- GitHub main の index.html、anime.html、anime-data.js、style.css、README.md を読み取り調査。
- Supabaseプロジェクト Animecia の public スキーマ、マイグレーション履歴、Security Advisor、Performance Advisor を読み取り専用で確認。
- 本番データや本番スキーマへの変更は実施していない。

## データベースの概況
- public スキーマのテーブル数：62
- public.anime：約10,696行
- public.animecia_public_anime：9,835行（公開カタログビューの件数）
- public.anime_genres：約32,000行
- public.anime_studios：約10,773行
- public.studios：902行
- public.anime_import_candidates：約4,101行
- 作品・ジャンル・制作会社・別名・外部リンク・レビュー・評価・お気に入り・視聴状態・おすすめ・広告・管理者用の各テーブルが既に存在する。
- 確認対象の全62テーブルでRLSが有効。ただし、RLS有効化だけではポリシーの妥当性を保証しない。

## 既存フロントエンドの所見
- anime.html は search_anime_catalog_v2 RPC を優先し、旧RPC search_anime_catalog、公開ビュー animecia_public_anime の順にフォールバックする設計。
- 一覧はサーバー側ページネーションを利用し、五十音順のための読みキー生成もSQL側に実装されている。
- anime-data.js にもローマ字を基準に五十音の行・段へ変換する比較ロジックが存在する。サーバー側とクライアント側の並び替え規則が完全一致するか、実データのテストケースで確認が必要。
- RPC失敗時のフォールバックでは、ジャンル・制作会社の指定がある場合にエラーを返し、条件を無視した結果を表示しない設計になっている。
- 現在の読み込み問題は、コードを読むだけでは再現確認できない。ブラウザコンソール、Network応答、Supabaseログで原因を特定する必要がある。

## Supabase Advisor の注意事項
### Security Advisor
- authenticated_security_definer_function_executable：13件。認証済みユーザーが実行可能な SECURITY DEFINER 関数が検出された。すべてが脆弱とは限らないため、各関数の権限チェック・引数検証・意図した呼び出し範囲を確認してから個別に対応する。
- auth_leaked_password_protection：漏えい済みパスワード保護が無効という警告。
- extension_in_public：pg_net が public スキーマにあるという警告。
- rls_enabled_no_policy：animecia_public_genre_audit と user_conversations にポリシーがない。意図的な完全非公開か、必要な権限の付け忘れかを確認する。
### Performance Advisor
- 未使用インデックス候補：39件。現状の検出だけを根拠に削除しない。利用期間・クエリ実績・重要な将来クエリを確認する。
- 複数の許可的RLSポリシー：17件。意図したアクセスが維持されるかを確認し、必要なら重複を統合する。
- これらの警告は優先順位付けのための調査結果であり、今回の作業では本番設定を変更していない。

## 推奨する次の作業
1. 本番スキーマとユーザーデータをバックアップできる手順を確認する。
2. search_anime_catalog_v2 と公開ビューの定義、権限、実際の呼び出し結果をステージング相当環境でテストする。
3. 五十音順の期待値テストを作る（数字・記号、英語名、かな、濁音・半濁音、小書き文字、長音、同名作品）。
4. RLS / SECURITY DEFINER の警告を機能ごとに監査し、権限テストを追加する。
5. 現行HTMLを即時に全面置換せず、新デザインを既存データと結び付ける前に機能別に移行する。
6. 実データ・認証・レビューを使ったテストが通った後にのみ、本番へ反映する。

## 制約
- ブラウザを使った実ユーザー操作や本番サイトのコンソール確認は、この監査では実施していない。
- データ行数は調査時点の値で、後に変化する可能性がある。
- Advisorの指摘は自動検出結果であり、個々の指摘が実際に悪用可能かは追加検証が必要。