# バックエンドエンジニア 引き継ぎメモ

## お願いしたいこと

現在 SQLite で動いている DB を **PostgreSQL（Neon）に切り替えて Render にデプロイ**する。

---

## 現状

| 項目 | 内容 |
|---|---|
| フレームワーク | FastAPI + SQLAlchemy 2.0 |
| 現在の DB | SQLite（`backend/keiba.db`） |
| ORM モデル | `backend/database.py` |
| 依存関係 | `backend/requirements.txt` |

---

## やること（3ステップ）

### 1. `database.py` の接続先を環境変数で切り替える

```python
# 現在
SQLALCHEMY_DATABASE_URL = "sqlite:///./keiba.db"

# 変更後
import os
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./keiba.db"  # ローカル開発はそのまま SQLite
)
# Neon の URL は postgres:// で来るので postgresql:// に変換
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)
```

### 2. `requirements.txt` に追加

```
psycopg2-binary>=2.9.9
```

### 3. Render にデプロイ

1. [render.com](https://render.com) → **New Web Service**
2. リポジトリ: `ux-lab-ok/keiba-app`
3. Root Directory: `backend`
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. 環境変数を設定:

| Key | Value |
|---|---|
| `DATABASE_URL` | Neon の接続文字列（`postgresql://...`） |
| `ANTHROPIC_API_KEY` | AI チャット用（任意） |

---

## Neon DB の作成手順

1. [neon.tech](https://neon.tech) でアカウント作成
2. New Project → `keiba-app`
3. Connection string をコピー → Render の `DATABASE_URL` に貼り付け

---

## CORS の更新（デプロイ後に必要）

`backend/main.py` の `allow_origins` に Vercel の URL を追加してください。

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://keiba-app.vercel.app",  # ← Vercel のURLに変更
    ],
    ...
)
```

---

## ローカル動作確認

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# → http://localhost:8000/docs で Swagger UI が開けばOK
```
