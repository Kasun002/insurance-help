# AI Insurance Help Center

A customer support portal for insurance queries, built with Next.js 19 + FastAPI + ChromaDB. It combines a browsable knowledge base scraped from Great Eastern Singapore with a RAG-powered AI chat assistant backed by Gemini.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 19 (App Router), React 19, TypeScript, Tailwind CSS |
| State | Zustand (chat), TanStack Query (server data) |
| Backend | FastAPI, Python 3.11, Pydantic v2 |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` (384-dim) |
| Vector DB (local) | ChromaDB (on-disk, cosine similarity) |
| Vector DB (prod) | pgvector on PostgreSQL (HNSW index) |
| Article DB (local) | TinyDB (JSON file) |
| Article DB (prod) | MongoDB |
| LLM | Gemini 2.5 Flash (`gemini-2.5-flash`) |
| Container | Docker multi-stage (3 stages) |

---

## Prerequisites

- Python 3.11
- Node.js 18+
- A Gemini API key

---

## Quick Start

### Backend

```bash
cd backend
python3.11 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # add GEMINI_API_KEY
python scripts/ingest.py      # chunk, embed, and store articles
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

The frontend runs on `http://localhost:3000`. API calls from the browser go to `/api/v1` (Next.js rewrites to `localhost:8000`). Server components use `BACKEND_URL` directly.

---

## Backend

### Configuration

All settings live in `app/config.py` as a Pydantic `Settings` class loaded from `.env`. Key variables:

| Variable | Purpose | Default |
|---|---|---|
| `GEMINI_API_KEY` | Gemini LLM access | — |
| `ENV` | `local` or `prod` | `local` |
| `ARTICLES_DB_PATH` | TinyDB JSON path | `app/data/articles.json` |
| `CHROMA_PERSIST_DIR` | ChromaDB directory | `app/data/chroma` |
| `MONGODB_URI` | Required when `ENV=prod` | — |
| `DATABASE_URL` | PostgreSQL URL for pgvector (prod) | — |
| `API_KEY_ENABLED` | Enables `X-API-Key` header check | `false` |
| `API_KEY` | Secret key value | — |
| `GUARDRAILS_ENABLED` | Toggle guardrail checks | `true` |
| `RAG_TOP_K` | Chunks retrieved per query | `5` |
| `SESSION_TTL_SECONDS` | Chat session lifetime | `7200` (2 h) |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:3000` |

Settings are cached with `@lru_cache` — loaded once at startup.

---

### Database Setup

The app switches between two storage backends based on the `ENV` variable, decided at startup in the `app/main.py` lifespan hook.

**Local (`ENV=local`) — default**
- **TinyDB** — articles stored as JSON at `app/data/articles.json`. Zero-setup, file-based.
- **ChromaDB** — vector embeddings persisted on disk at `app/data/chroma`. Cosine similarity, HNSW index.

**Production (`ENV=prod`)**
- **MongoDB** — article documents stored in a remote Atlas/self-hosted cluster. `MongoArticleRepo` seeds itself from `articles.json` on first run.
- **pgvector** — embeddings stored in a PostgreSQL table (`chunks`) with an HNSW index (`vector_cosine_ops`). Used when deployed to Railway.

Both storage pairs implement the same `BaseArticleRepo` / `BaseVectorRepo` interfaces, so all service code is storage-agnostic.

---

### How Embedding Works

**1. Web scraping (`scripts/scrape_great_eastern.py`)**

The scraper fetches Great Eastern Singapore self-service guide pages listed in `target_urls.txt`. It uses BeautifulSoup to strip navigation/footer noise and converts HTML to Markdown. It also extracts structured data: numbered steps, document checklists, PDF attachments, contact details, and an auto-generated summary. Output is saved to `app/data/articles_raw.json`.

**2. Synthesis (`scripts/synthesize_articles.py`)**

Raw scraped articles are passed through Gemini to enrich content and generate IDs, producing `app/data/articles.json` — the final source of truth for both the article DB and the ingestion pipeline.

**3. Chunking and ingestion (`scripts/ingest.py`)**

`ingest.py` reads `articles.json` and splits each article's `content_markdown` using LangChain's `RecursiveCharacterTextSplitter` (chunk size 500, overlap 50, splits on `\n## `, `\n### `, `\n\n`, `\n`, `. `). The article title is prepended to the first chunk to improve retrieval relevance. Each chunk carries metadata: `article_id`, `article_title`, `article_slug`, `category_id`, `subcategory_id`, `section_header`, `chunk_index`, `source_url`, `tags`.

Chunks are embedded in batches of 64 using `all-MiniLM-L6-v2` (384-dimensional vectors) and upserted into the vector store. The same script targets either ChromaDB (local) or pgvector (prod) depending on the `--env` flag.

---

### How Similarity Search Works

When a user submits a query (search bar or chat), the query text is embedded with the same `all-MiniLM-L6-v2` model and a cosine similarity search runs against the vector store.

**Article search (`SearchService`):**
1. Vector similarity search — fetch `limit * 2` top chunks.
2. Keyword boost — compute token overlap between the query and each article title; add `0.15 * overlap_ratio` to the raw similarity score.
3. Deduplicate — keep only the highest-scoring chunk per article.
4. Trim to `limit`, fetch full article metadata from `ArticleRepo`.
5. Build a 200-character snippet centred on the first query-term match in the chunk.

**RAG chat (`RAGService`):**
1. Optional `where` filter on `article_id` when the chat was seeded from a specific article page.
2. Similarity search — top `RAG_TOP_K` (default 5) chunks.
3. Deduplicate by article — keep best-scoring chunk per article.
4. Build a numbered context block (section header + chunk text).
5. Combine context + conversation history + query into the prompt template.
6. Send to Gemini; return `RAGResponse` with content, source citations, chunk count, and latency.

---

### Guardrails

Guardrails are pure regex/keyword checks — no LLM calls, sub-millisecond per request. Controlled by `GUARDRAILS_ENABLED` in `.env`.

**InputGuardrail** (runs before the RAG pipeline):
- **PII detection** — blocks queries containing a Singapore NRIC (`S/T/F/G\d{7}[A-Z]`), credit card numbers (16-digit patterns), or SG phone numbers. Returns HTTP 422 with code `GUARDRAIL_VIOLATION`.
- **Prompt injection** — blocks known jailbreak phrases (`ignore previous instructions`, `act as`, `jailbreak`, `bypass`, and ~15 others).
- **Topic relevance** — queries over 20 characters with zero overlap against an insurance domain keyword set (~40 terms covering claims, premiums, coverage, hospital, motor, beneficiary, etc.) are rejected as off-topic. This check is skipped for follow-up turns (when prior messages already exist in the session), so contextual replies like "Any other requirements?" are not blocked.

**OutputGuardrail** (runs after Gemini responds):
- **PII redaction** — any PII patterns found in the response are replaced with `[REDACTED]`.
- **Grounding check** — if the response is shorter than 20 characters or no chunks were retrieved, a fallback disclaimer is appended directing the user to Great Eastern support.
- **Safety disclaimer** — if the response mentions death claims, TPD, critical illness, or terminal conditions, a hotline disclaimer is appended.

---

### In-Memory Session Caching

Chat sessions are held in a Python dict inside `SessionRepo` — no external store required. Each session gets a UUID-based ID (`sess_<12hex>`), stores the full message history, and has a 2-hour TTL enforced on read (idle sessions are evicted lazily). Sessions are lost on server restart. When a client sends a message with a stale session ID, the backend silently auto-creates a new session and returns the new `session_id` in the response — the frontend syncs its stored ID automatically with no error shown to the user. The `SESSION_TTL_SECONDS` setting controls the TTL.

---

### LLM

**Model:** `gemini-2.5-flash` via the `google-genai` SDK.

`GeminiClient` wraps the synchronous SDK in `asyncio.to_thread` so it does not block FastAPI's event loop. It retries up to `LLM_MAX_RETRIES` (default 3) times with exponential backoff (2s, 4s, 8s) on HTTP 429, 500, and 503 responses. Rate-limit detection matches on `429`, `quota`, `resource_exhausted`, and `rate_limit` — not the broad word `rate` which caused false positives. A `RateLimitError` is raised if retries are exhausted on a quota error; `LLMError` for everything else.

**Token optimisation:** `LLM_TEMPERATURE=0.2` keeps responses factual and deterministic. The RAG pipeline deduplicates chunks before building the prompt (at most one chunk per article), keeping context windows tight. Conversation history is included as a plain `User/Assistant` transcript in the prompt — no overhead from structured message arrays.

---

### Security

**API key** — `X-API-Key` header, enabled via `API_KEY_ENABLED=true` + `API_KEY=<secret>`. Disabled locally. Applied as a FastAPI dependency at the router level so all protected routes require it without per-endpoint changes.

**CORS** — `CORS_ORIGINS` is a comma-separated list injected into `CORSMiddleware`. Locally allows `localhost:3000`; in production set to the deployed frontend URL.

**Guardrails** — block PII, prompt injection, and off-topic queries before they reach the LLM (see above).

**Input validation** — Pydantic schemas enforce types and length limits (`CHAT_MESSAGE_MIN_LEN=5`, `CHAT_MESSAGE_MAX_LEN=2000`, `SEARCH_QUERY_MAX_LEN=200`). FastAPI returns structured 422 responses for invalid payloads. The frontend parses 422 detail arrays and displays the human-readable `msg` field rather than raw `[object Object]`.

---

### Docker

The backend Dockerfile is a 3-stage build:

1. **deps** — installs production Python packages into `/install` using `requirements-prod.txt`.
2. **model** — downloads `all-MiniLM-L6-v2` from HuggingFace into `/model_cache` at build time so the container never reaches the internet at runtime.
3. **runtime** — copies packages and model cache into a clean `python:3.11-slim`, then copies only `app/` (scripts, chroma data, and venv excluded by `.dockerignore`).

The container starts with `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`. Railway injects `PORT` automatically.

---

## Frontend

### How It Works

The frontend is a Next.js 19 App Router application. Pages live under `app/` with route segments for `category/[id]` and `article/[slug]`. Each route has co-located `loading.tsx` and `error.tsx` for Suspense and error boundaries.

**Data fetching is split by context:**

- **Server components** (`app/page.tsx`, `app/category/[id]/page.tsx`, `app/article/[slug]/page.tsx`) fetch data directly from the backend via `BACKEND_URL`. This gives full SSR with no client JS for the initial page render.
- **Client components** (search results, chat) use TanStack Query for caching, deduplication, and background refetching.

### Components

Components are grouped by domain:

- `components/help/` — `SearchBar`, `CategoryGrid`, `CategoryTile`, `ArticleCard`, `ArticleList`, `ArticleContent`, `ArticleAttachments`, `RelatedArticles`, `SearchResultCard`, `Breadcrumb`, `PopularQuestions`, `AskAiCta`
- `components/chat/` — `ChatWidget`, `ChatPanel`, `ChatInput`, `MessageBubble`, `SourceCitation`, `EmptyChat`, `SuggestionChips`
- `components/layout/` — `Header`, `Footer`, `ChatFab` (floating action button that opens the chat drawer)
- `components/shared/` — `EmptyState`, `ErrorState`, `LoadingSpinner`
- `components/ui/` — shadcn/ui primitives (`Button`, `Card`, `Badge`, `Input`, `Sheet`, `Skeleton`)

### API Calls

All HTTP calls go through `lib/api/client.ts` (`apiFetch`), which resolves the base URL per context:

- **Browser** — uses `/api/v1` (relative path), relying on a reverse proxy or Next.js rewrite to reach the backend.
- **Server (SSR)** — uses `process.env.BACKEND_URL + /api/v1` for a direct backend call.

Domain modules (`lib/api/categories.ts`, `lib/api/articles.ts`, `lib/api/search.ts`, `lib/api/chat.ts`) wrap `apiFetch` with typed responses. `ApiError` carries the HTTP status code so callers can react to specific codes (e.g. 404 triggers a session reset in the chat store).

### State Management

**TanStack Query** manages all server state (categories, articles, search results). The `useSearch` hook gates queries to `enabled: query.length > 1` and caches results for 60 seconds. `useDebounce` prevents a fetch on every keystroke.

**Zustand** (`store/chatStore.ts`) manages the chat widget's client-only state: open/closed, session ID, message list, and `isGenerating` flag. The store handles the full chat lifecycle:

1. **`openChat`** — restores a persisted session from `localStorage` or creates a new one via `POST /chat/sessions`. If opened from an article page, `seed_article_id` is passed so the RAG pipeline can bias retrieval toward that article.
2. **`sendMessage`** — adds an optimistic user bubble immediately, calls `POST /chat/sessions/{id}/messages`, then appends the assistant response. On each successful response the store syncs `sessionId` from `response.session_id` — if the backend auto-created a new session (e.g. after a restart), the FE picks up the new ID transparently. Uses an `AbortController` so switching sessions mid-flight cancels the in-progress request.
3. **`resetSession`** — aborts any in-flight request, clears `localStorage`, and resets all state.

Session ID is persisted in `localStorage` (`insurehelp_chat_session`) so the conversation survives page navigations.

### Rendering Optimisation

- Server components handle SSR for all browsable content — categories, articles, and article detail are rendered on the server with no client JS.
- Chat and search are client-rendered because they are interactive.
- `ChatPanel` tracks scroll position via a ref and auto-scrolls to the bottom only when the user is already within 80px of the bottom, preventing disruptive jumps while reading.
- `react-markdown` with `remark-gfm` renders Gemini's Markdown responses inside the chat bubble.

### Frontend Security

- `apiFetch` attaches the `X-API-Key` from environment variables as a header, keeping the key out of component code.
- `ApiError` surfaces HTTP status codes. FastAPI 422 validation error arrays are parsed to extract the human-readable `msg` field before displaying to the user.
- No client-side authentication — all access control is enforced by the backend API key middleware and guardrails.

---

## Running URLs

| Service | Local URL |
|---|---|
| Frontend | `http://localhost:3000` |
| Backend API | `http://localhost:8000/api/v1` |
| Swagger UI (interactive API docs) | `http://localhost:8000/docs` |
| ReDoc (API reference) | `http://localhost:8000/redoc` |
| Health check | `http://localhost:8000/api/v1/health` |
