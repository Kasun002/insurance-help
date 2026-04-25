# AI Insurance Help Center

A modern customer support portal demonstrating RAG-grounded AI assistance
for insurance queries, built with Next.js 14 + FastAPI + ChromaDB.

> Full setup instructions and architecture overview coming after implementation.
> See `be-task.md` and `fe-task.md` for the implementation plan.

## Quick start (placeholder)

### Backend
```bash
cd backend
python3.11 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # add GEMINI_API_KEY
python scripts/ingest.py
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```
