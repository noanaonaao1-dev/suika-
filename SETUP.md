# スイカゲーム風アプリ 自動デプロイ手順書

このプロジェクトには、Cloudflare へのデプロイを自動化するスクリプトが含まれています。

## 1. 準備
- [Cloudflare アカウント](https://dash.cloudflare.com/)の作成
- Node.js のインストール
- Cloudflare へのログイン:
  ```bash
  npx wrangler login
  ```

## 2. 自動デプロイの実行
ルートディレクトリで以下のコマンドを実行するだけで、KVの作成、バックエンドのデプロイ、フロントエンドのビルドとデプロイがすべて完了します。

```bash
bash deploy.sh
```

## 3. 手動で設定したい場合
何らかの理由で自動スクリプトが動かない場合は、以下の手順で行ってください。

### バックエンド (Workers + KV)
1. KV Namespace `RANKING_KV` を作成し、IDを `backend/wrangler.toml` に記入。
2. `cd backend && npx wrangler deploy` を実行。
3. 表示された URL をメモ。

### フロントエンド (Pages)
1. `export VITE_API_URL=メモしたURL` を実行。
2. `npm run build` を実行。
3. `dist` フォルダを Cloudflare Pages にアップロード。
