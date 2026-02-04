# スイカゲーム風アプリ セットアップ手順書 (KV版)

このプロジェクトは、Cloudflare Pages（フロントエンド）と Cloudflare Workers + KV（ランキング機能）を使用してホスティングするように設計されています。

## 1. 準備するもの
- Cloudflare アカウント
- Node.js 環境

## 2. ランキング用バックエンド (Workers + KV) のセットアップ

### ダッシュボードから設定する場合
1. Cloudflare ダッシュボードで **「Workers & Pages」→「KV」** を開き、名前を `RANKING_KV` にして Namespace を作成します。
2. **「Workers & Pages」→「Overview」** から Workers を作成し、`backend/src/index.ts` のコードを貼り付けてデプロイします。
3. Workers の設定画面で **「Settings」→「Variables」→「KV Namespace Bindings」** に移動します。
4. **「Add binding」** を押し、以下を設定して保存します：
   - Variable name: `RANKING_KV`
   - KV namespace: 先ほど作成した `RANKING_KV`
5. 作成した Workers の URL をメモします。

### コマンドラインから設定する場合
1. KV Namespace を作成します。
   ```bash
   npx wrangler kv:namespace create RANKING_KV
   ```
2. 出力された `id` を `backend/wrangler.toml` の `id` に貼り付けます。
3. `backend` ディレクトリでデプロイします。
   ```bash
   cd backend
   npx wrangler deploy
   ```

## 3. フロントエンド (Pages) のデプロイ

1. ルートディレクトリで環境変数を設定してビルドします。
   ```bash
   # メモしたバックエンド URL を設定
   export VITE_API_URL=https://あなたのURL.workers.dev
   npm run build
   ```
2. `dist` フォルダを Cloudflare Pages にアップロードします。
