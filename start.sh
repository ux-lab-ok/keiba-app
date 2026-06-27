#!/bin/bash
# 競馬AI予想アプリ 起動スクリプト

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🏇 競馬AI予想アプリを起動します..."

# Backend
echo "▶ バックエンドを起動中..."
cd "$SCRIPT_DIR/backend"
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

sleep 2

# Frontend
echo "▶ フロントエンドを起動中..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ 起動完了！"
echo "   ブラウザで開く → http://localhost:5173"
echo ""
echo "終了するには Ctrl+C を押してください"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'アプリを終了しました'" EXIT
wait
