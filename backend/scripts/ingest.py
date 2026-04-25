"""
ingest.py
---------
Chunks articles from articles.json, embeds with all-MiniLM-L6-v2,
and upserts into the vector store.

Local (default):
    python scripts/ingest.py
    python scripts/ingest.py --reset

Production (Railway — pgvector):
    ENV=prod DATABASE_URL=postgresql://... python scripts/ingest.py --env prod
    ENV=prod DATABASE_URL=postgresql://... python scripts/ingest.py --env prod --reset
"""

import argparse
import json
import os
import re
from pathlib import Path

import chromadb
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
from tinydb import TinyDB
from tinydb.storages import JSONStorage
from tinydb.middlewares import CachingMiddleware

# ── Config ───────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).parent.parent
DEFAULT_DB = BASE_DIR / "app/data/articles.json"
DEFAULT_CHROMA = BASE_DIR / "app/data/chroma"

COLLECTION_NAME = "insurance_articles"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50
BATCH_SIZE = 64  # embed + upsert in batches to avoid OOM on large runs


# ── Helpers ───────────────────────────────────────────────────────────────────

def extract_section_header(chunk_text: str) -> str:
    """Return the first ## or ### heading found in the chunk, or empty string."""
    match = re.search(r"^#{2,3}\s+(.+)$", chunk_text, re.MULTILINE)
    return match.group(1).strip() if match else ""


def build_chunk_id(article_id: str, index: int) -> str:
    return f"chunk_{article_id}_{index:04d}"


def article_to_chunks(
    article: dict,
    splitter: RecursiveCharacterTextSplitter,
) -> list[dict]:
    """Split one article's markdown into embedded-ready chunk dicts."""
    content = article.get("content_markdown", "").strip()

    # Articles with no content (e.g. PDF-only pages) — skip chunking
    if not content:
        return []

    texts = splitter.split_text(content)

    # Prepend title to first chunk for better retrieval
    if texts:
        texts[0] = f"# {article['title']}\n\n{texts[0]}"

    chunks = []
    for idx, text in enumerate(texts):
        chunks.append(
            {
                "id": build_chunk_id(article["id"], idx),
                "document": text,
                "metadata": {
                    "article_id": article["id"],
                    "article_title": article["title"],
                    "article_slug": article["slug"],
                    "category_id": article["category_id"],
                    "subcategory_id": article["subcategory_id"],
                    "section_header": extract_section_header(text),
                    "chunk_index": idx,
                    "source_url": article.get("source_url", ""),
                    # Chroma metadata values must be primitives
                    "tags": ",".join(article.get("tags", [])),
                },
            }
        )
    return chunks


def upsert_batch(
    collection: chromadb.Collection,
    model: SentenceTransformer,
    batch: list[dict],
) -> None:
    texts = [c["document"] for c in batch]
    embeddings = model.encode(texts, show_progress_bar=False).tolist()
    collection.upsert(
        ids=[c["id"] for c in batch],
        documents=texts,
        embeddings=embeddings,
        metadatas=[c["metadata"] for c in batch],
    )


# ── pgvector (prod) ingest ─────────────────────────────────────────────────────

def ingest_pgvector(
    articles: list[dict],
    model: SentenceTransformer,
    splitter: RecursiveCharacterTextSplitter,
    database_url: str,
    table_name: str,
    reset: bool,
) -> None:
    import psycopg2
    import psycopg2.extras

    valid = [a for a in articles if a.get("content_markdown", "").strip()]
    skipped = len(articles) - len(valid)
    if skipped:
        print(f"  Skipped {skipped} articles with no content (PDF-only pages)")

    print(f"\nConnecting to PostgreSQL...")
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()

    cur.execute("CREATE EXTENSION IF NOT EXISTS vector")

    if reset:
        cur.execute(f"DROP TABLE IF EXISTS {table_name}")
        print(f"  Dropped table '{table_name}'")

    cur.execute(f"""
        CREATE TABLE IF NOT EXISTS {table_name} (
            id              TEXT PRIMARY KEY,
            document        TEXT        NOT NULL,
            embedding       vector(384) NOT NULL,
            article_id      TEXT,
            article_title   TEXT,
            article_slug    TEXT,
            category_id     TEXT,
            subcategory_id  TEXT,
            section_header  TEXT,
            chunk_index     INTEGER,
            source_url      TEXT,
            tags            TEXT
        )
    """)
    cur.execute(f"""
        CREATE INDEX IF NOT EXISTS {table_name}_embedding_idx
        ON {table_name}
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)
    conn.commit()
    print(f"  Table '{table_name}' ready")

    print(f"\nChunking {len(valid)} articles...")
    all_chunks: list[dict] = []
    for article in valid:
        all_chunks.extend(article_to_chunks(article, splitter))
    print(f"  {len(all_chunks)} total chunks generated")

    print(f"\nEmbedding and upserting in batches of {BATCH_SIZE}...")
    total_batches = (len(all_chunks) + BATCH_SIZE - 1) // BATCH_SIZE

    for i in range(0, len(all_chunks), BATCH_SIZE):
        batch = all_chunks[i: i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        print(f"  Batch {batch_num}/{total_batches} ({len(batch)} chunks)...", end=" ", flush=True)

        texts = [c["document"] for c in batch]
        embeddings = model.encode(texts, show_progress_bar=False).tolist()

        rows = []
        for chunk, emb in zip(batch, embeddings):
            m = chunk["metadata"]
            vec_str = "[" + ",".join(str(v) for v in emb) + "]"
            rows.append((
                chunk["id"], chunk["document"], vec_str,
                m["article_id"], m["article_title"], m["article_slug"],
                m["category_id"], m["subcategory_id"], m["section_header"],
                m["chunk_index"], m["source_url"], m["tags"],
            ))

        psycopg2.extras.execute_values(
            cur,
            f"""
            INSERT INTO {table_name}
                (id, document, embedding, article_id, article_title, article_slug,
                 category_id, subcategory_id, section_header, chunk_index, source_url, tags)
            VALUES %s
            ON CONFLICT (id) DO UPDATE SET
                document       = EXCLUDED.document,
                embedding      = EXCLUDED.embedding,
                article_title  = EXCLUDED.article_title,
                section_header = EXCLUDED.section_header
            """,
            rows,
            template="(%s, %s, %s::vector, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
        )
        conn.commit()
        print("done")

    cur.execute(f"SELECT COUNT(*) FROM {table_name}")
    final_count = cur.fetchone()[0]
    cur.close()
    conn.close()

    print(f"\n{'='*60}")
    print(f"Articles processed : {len(valid)} (+ {skipped} skipped)")
    print(f"Chunks generated   : {len(all_chunks)}")
    print(f"pgvector total     : {final_count}")
    print(f"Table              : {table_name}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Chunk, embed, and ingest articles into vector store")
    parser.add_argument("--db", default=str(DEFAULT_DB), help="Path to articles.json")
    parser.add_argument("--chroma", default=str(DEFAULT_CHROMA), help="ChromaDB persist directory (local only)")
    parser.add_argument("--env", default="local", choices=["local", "prod"], help="Target environment")
    parser.add_argument("--reset", action="store_true", help="Drop existing collection/table before ingesting")
    args = parser.parse_args()

    db_path = Path(args.db)

    if not db_path.exists():
        raise FileNotFoundError(f"articles.json not found at {db_path}. Run synthesize_articles.py first.")

    # ── Load articles ─────────────────────────────────────────────────────────
    print(f"Loading articles from {db_path}...")
    raw_data = json.loads(db_path.read_text())
    articles = raw_data.get("articles", [])
    print(f"  {len(articles)} articles loaded")

    # ── Init splitter + model ─────────────────────────────────────────────────
    print(f"\nLoading embedding model '{EMBEDDING_MODEL}'...")
    model = SentenceTransformer(EMBEDDING_MODEL)
    print(f"  Model loaded — {model.get_sentence_embedding_dimension()} dims")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n## ", "\n### ", "\n\n", "\n", ". "],
        length_function=len,
    )

    # ── Branch on environment ─────────────────────────────────────────────────
    if args.env == "prod":
        database_url = os.environ.get("DATABASE_URL", "")
        if not database_url:
            raise RuntimeError(
                "DATABASE_URL environment variable is required for --env prod.\n"
                "Example: DATABASE_URL=postgresql://user:pass@host/db python scripts/ingest.py --env prod"
            )
        ingest_pgvector(
            articles=articles,
            model=model,
            splitter=splitter,
            database_url=database_url,
            table_name=os.environ.get("PGVECTOR_TABLE", "chunks"),
            reset=args.reset,
        )
        return

    # ── Local: ChromaDB ───────────────────────────────────────────────────────
    chroma_dir = Path(args.chroma)
    chroma_dir.mkdir(parents=True, exist_ok=True)

    print(f"\nConnecting to ChromaDB at {chroma_dir}...")
    client = chromadb.PersistentClient(path=str(chroma_dir))

    if args.reset:
        try:
            client.delete_collection(COLLECTION_NAME)
            print(f"  Dropped existing collection '{COLLECTION_NAME}'")
        except Exception:
            pass

    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )
    print(f"  Collection '{COLLECTION_NAME}' ready (existing docs: {collection.count()})")

    # Filter out empty-content articles
    valid = [a for a in articles if a.get("content_markdown", "").strip()]
    skipped = len(articles) - len(valid)
    if skipped:
        print(f"  Skipped {skipped} articles with no content (PDF-only pages)")

    print(f"\nChunking {len(valid)} articles...")
    all_chunks: list[dict] = []
    for article in valid:
        all_chunks.extend(article_to_chunks(article, splitter))
    print(f"  {len(all_chunks)} total chunks generated")

    print(f"\nEmbedding and upserting in batches of {BATCH_SIZE}...")
    total_batches = (len(all_chunks) + BATCH_SIZE - 1) // BATCH_SIZE

    for i in range(0, len(all_chunks), BATCH_SIZE):
        batch = all_chunks[i: i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        print(f"  Batch {batch_num}/{total_batches} ({len(batch)} chunks)...", end=" ", flush=True)
        upsert_batch(collection, model, batch)
        print("done")

    final_count = collection.count()
    print(f"\n{'='*60}")
    print(f"Articles processed : {len(valid)} (+ {skipped} skipped)")
    print(f"Chunks generated   : {len(all_chunks)}")
    print(f"Chroma total count : {final_count}")
    print(f"Collection         : {COLLECTION_NAME}")
    print(f"Persisted at       : {chroma_dir}")

    if final_count < 100:
        print(f"\nWarning: only {final_count} chunks — expected ~300+.")
        print("Re-run synthesize_articles.py with a Gemini key to add more articles.")


if __name__ == "__main__":
    main()
