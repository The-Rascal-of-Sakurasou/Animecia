# ANIXIA 初回管理者・Annict同期セットアップ

この手順は、ANIXIAの最初の管理者を登録し、作品データの初回同期を行うためのものです。

## 1. ANIXIAアカウントを作成

1. https://the-rascal-of-sakurasou.github.io/anixia/signup.html を開く。
2. 自分のメールアドレスで登録し、確認メールの手続きを完了する。
3. https://the-rascal-of-sakurasou.github.io/anixia/login.html からログインする。
4. https://the-rascal-of-sakurasou.github.io/anixia/admin.html を開く。

## 2. 自分のアカウントを管理者に登録

ログイン済みで管理者権限がない場合、管理画面に自分のUser IDが表示される。

ANIXIA Supabaseプロジェクト（trvnxggqzlhqdhoyiliy）のSQL Editorで、次のSQLを実行する。<自分のUser ID> を管理画面に表示されたUUIDに置き換える。

```sql
INSERT INTO private.admin_users (user_id)
VALUES ('<自分のUser ID>'::uuid)
ON CONFLICT (user_id) DO NOTHING;
```

このSQLには自分のUser IDだけを入力する。パスワード、メール確認コード、APIトークンをチャットやGitHubへ貼り付けない。

## 3. Annictの読み取り専用トークンを発行

1. Annictの開発者向け設定からPersonal Access Tokenを作成する。
2. 権限は作品情報を読むためのread-only scopeだけにする。
3. ユーザー情報など不要な権限は付けない。

公式ガイド：
https://developers.annict.com/docs/authentication/personal-access-token

## 4. Supabase Edge Function Secretへ保存

1. Supabase DashboardでANIXIAプロジェクトを開く。
2. Edge FunctionsのSecretsを開く。
3. 次の名前でSecretを追加する。

| 項目 | 値 |
|---|---|
| Name | ANNICT_ACCESS_TOKEN |
| Value | Annictで発行した読み取り専用トークン |

トークンはSupabaseのSecretsにだけ保存する。ANIXIAのHTML/JavaScript、GitHubリポジトリ、公開設定、チャットには入力しない。

公式ガイド：
https://supabase.com/docs/guides/functions/secrets

## 5. 初回同期

1. ANIXIA管理画面を再読み込みする。
2. まず1ページだけ同期する（最大50作品）。
3. 「作品候補の審査」で未公開候補を確認する。
4. 日本作品・対象形式・成人向けでないこと・情報の正確性を確認できた作品だけ公開する。
5. 問題がなければ、次のページを少しずつ同期する。

同期処理は画像URLを取得せず、作品を自動公開しない。公開判断は管理者が行う。

## 6. 注意

- User IDは自分の管理者登録SQLにだけ使う。第三者のIDを登録しない。
- パスワードやAnnictトークンを他人に共有しない。
- Annict APIの規約・レート制限は変更される可能性があるため、同期を増やす前に公式情報を再確認する。
- 作品データを一括ダウンロード可能なデータセットや独自APIとして再配布しない。