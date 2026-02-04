#!/bin/bash

# Cloudflare 自動デプロイスクリプト

echo "🚀 デプロイを開始します..."

# 1. バックエンドのセットアップ
cd backend

echo "📦 KV Namespace を作成中..."
# すでに存在する場合はエラーになるが、出力を取得して ID を抽出する
KV_OUTPUT=$(npx wrangler kv:namespace create RANKING_KV 2>&1)
KV_ID=$(echo "$KV_OUTPUT" | grep "id =" | head -1 | sed 's/.*id = "\(.*\)".*/\1/')

if [ -z "$KV_ID" ]; then
    # すでに存在する場合、リストから取得を試みる
    echo "⚠️ KV は作成済みか、エラーが発生しました。既存のリストから取得を試みます..."
    KV_ID=$(npx wrangler kv:namespace list | grep -B 1 "RANKING_KV" | grep "id" | sed 's/.*"id": "\(.*\)".*/\1/')
fi

if [ -z "$KV_ID" ]; then
    echo "❌ KV ID の取得に失敗しました。wrangler login しているか確認してください。"
    exit 1
fi

echo "✅ KV ID: $KV_ID"

# wrangler.toml の更新
cat <<EOF > wrangler.toml
name = "suika-ranking"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "RANKING_KV"
id = "$KV_ID"
EOF

echo "📡 バックエンド (Workers) をデプロイ中..."
DEPLOY_OUTPUT=$(npx wrangler deploy)
WORKER_URL=$(echo "$DEPLOY_OUTPUT" | grep -o 'https://suika-ranking\.[a-zA-Z0-9-]*\.workers\.dev' | head -1)

if [ -z "$WORKER_URL" ]; then
    echo "❌ Workers のデプロイに失敗したか、URLの取得に失敗しました。"
    exit 1
fi

echo "✅ Workers URL: $WORKER_URL"

# 2. フロントエンドのビルドとデプロイ
cd ..

echo "🏗️ フロントエンドをビルド中..."
export VITE_API_URL=$WORKER_URL
npm run build

echo "🚀 Cloudflare Pages にデプロイ中..."
# プロジェクト名は適宜変更してください
npx wrangler pages deploy dist --project-name suika-game

echo "✨ すべてのデプロイが完了しました！"
echo "URL: $WORKER_URL"
echo "Pages の管理画面で最終的な公開URLを確認してください。"
