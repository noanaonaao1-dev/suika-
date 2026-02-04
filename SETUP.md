# スイカゲーム風アプリ セットアップ手順書

このプロジェクトは、Cloudflare Pages（フロントエンド）と Cloudflare Workers + D1（ランキング機能）を使用してホスティングするように設計されています。

## 1. 準備するもの
- Cloudflare アカウント
- Node.js 環境
- `wrangler` CLI (Cloudflare のツール)

## 2. データベース (D1) のセットアップ

1. Cloudflare D1 データベースを作成します。
   ```bash
   npx wrangler d1 create suika-db
   ```
2. 出力された `database_id` を `backend/wrangler.toml` の `database_id` フィールドに貼り付けます。

3. データベースの初期化（テーブル作成）を行います。
   ```bash
   npx wrangler d1 execute suika-db --file=backend/schema.sql
   ```

## 3. バックエンド (Workers) のデプロイ

1. `backend` ディレクトリに移動します。
   ```bash
   cd backend
   ```
2. デプロイを実行します。
   ```bash
   npx wrangler deploy
   ```
3. デプロイ後に表示される URL（例: `https://suika-ranking.your-subdomain.workers.dev`）をメモしておきます。

## 4. フロントエンド (Pages) のデプロイ

1. ルートディレクトリに戻り、環境変数を設定してビルドします。
   ```bash
   # .env.local ファイルを作成し、先程のバックエンド URL を設定します
   echo "VITE_API_URL=https://suika-ranking.your-subdomain.workers.dev" > .env.local

   # ビルドを実行
   npm install
   npm run build
   ```
2. Cloudflare Pages にデプロイします。
   - Cloudflare ダッシュボードから "Pages" -> "Create a project" -> "Direct Upload" を選択。
   - プロジェクト名を入力し、`dist` フォルダをアップロードします。
   - または、GitHub 連携を使用して自動デプロイを設定することも可能です。その場合は、ビルドコマンドに `npm run build`、ビルド出力ディレクトリに `dist` を設定し、環境変数 `VITE_API_URL` を Cloudflare Pages の管理画面で設定してください。

## 5. モバイルでの動作確認
1. デプロイされた Pages の URL にスマートフォンからアクセスします。
2. 「プレイ開始」ボタンを押すと、ジャイロセンサーの利用許可を求められるので「許可」してください。
3. スマホを左右に傾けると、次に落とすフルーツの位置が変わります。
4. スマホを大きく傾けると、容器内のフルーツに重力がかかります。
5. 5秒間操作しないと自動的にフルーツが落下します。
