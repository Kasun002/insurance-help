"""
pg_vector_repo.py
-----------------
Production (PostgreSQL + pgvector) implementation of BaseVectorRepo.
Used when ENV=prod.

Requires:
  - PostgreSQL with the pgvector extension enabled
  - A populated `chunks` table (run: python scripts/ingest.py --env prod)
  - DATABASE_URL env var pointing to your Railway Postgres instance
"""

import psycopg2
import psycopg2.extras
from sentence_transformers import SentenceTransformer

from app.models.domain import Chunk
from app.repositories.base import BaseVectorRepo


class PgVectorRepo(BaseVectorRepo):
    def __init__(
        self,
        database_url: str,
        embedding_model: str,
        table_name: str = "chunks",
    ) -> None:
        self._dsn = database_url
        self._table = table_name
        self._model = SentenceTransformer(embedding_model)
        self._setup_table()

    # ── Setup ─────────────────────────────────────────────────────────────────

    def _conn(self):
        """Open a new connection (use as context manager)."""
        return psycopg2.connect(self._dsn)

    def _setup_table(self) -> None:
        """Ensure pgvector extension, chunks table, and HNSW index exist."""
        with self._conn() as conn, conn.cursor() as cur:
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
            cur.execute(f"""
                CREATE TABLE IF NOT EXISTS {self._table} (
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
            # HNSW index — no minimum row count requirement (unlike ivfflat)
            cur.execute(f"""
                CREATE INDEX IF NOT EXISTS {self._table}_embedding_idx
                ON {self._table}
                USING hnsw (embedding vector_cosine_ops)
                WITH (m = 16, ef_construction = 64)
            """)
            conn.commit()

    # ── Public API ────────────────────────────────────────────────────────────

    def similarity_search(
        self,
        query: str,
        top_k: int = 5,
        where: dict | None = None,
    ) -> list[Chunk]:
        """
        Embed query and retrieve top_k most similar chunks from pgvector.

        The optional `where` filter uses Chroma-compatible syntax:
            {"article_id": {"$eq": "art_claims_travel_001"}}
        or the shorthand:
            {"article_id": "art_claims_travel_001"}
        """
        embedding = self._model.encode(query).tolist()
        # Represent the vector as a PostgreSQL literal string
        vec_str = "[" + ",".join(str(v) for v in embedding) + "]"

        # Build WHERE clause from optional filter
        where_sql = ""
        params: list = [vec_str]  # 1st %s → score calc in SELECT

        if where:
            article_id = self._extract_eq(where, "article_id")
            if article_id:
                where_sql = "WHERE article_id = %s"
                params.append(article_id)  # 2nd %s → WHERE

        params += [vec_str, top_k]  # ORDER BY vec, LIMIT

        sql = f"""
            SELECT  id,
                    document,
                    article_id,
                    article_title,
                    article_slug,
                    category_id,
                    subcategory_id,
                    section_header,
                    chunk_index,
                    source_url,
                    tags,
                    1 - (embedding <=> %s::vector) AS score
            FROM    {self._table}
            {where_sql}
            ORDER BY embedding <=> %s::vector
            LIMIT   %s
        """

        with self._conn() as conn, conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

        return [
            Chunk(
                id=row[0],
                document=row[1],
                score=round(float(row[11]), 4),
                metadata={
                    "article_id":     row[2] or "",
                    "article_title":  row[3] or "",
                    "article_slug":   row[4] or "",
                    "category_id":    row[5] or "",
                    "subcategory_id": row[6] or "",
                    "section_header": row[7] or "",
                    "chunk_index":    row[8] or 0,
                    "source_url":     row[9] or "",
                    "tags":           row[10] or "",
                },
            )
            for row in rows
        ]

    def get_collection_stats(self) -> dict:
        with self._conn() as conn, conn.cursor() as cur:
            cur.execute(f"SELECT COUNT(*) FROM {self._table}")
            count = cur.fetchone()[0]
        return {
            "collection_name": self._table,
            "chunk_count": count,
            "embedding_model": self._model.get_sentence_embedding_dimension(),
        }

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _extract_eq(where: dict, field: str):
        """
        Extract a scalar equality value from a Chroma-style filter dict.
        Supports both {"field": {"$eq": val}} and {"field": val}.
        """
        val = where.get(field)
        if val is None:
            return None
        if isinstance(val, dict):
            return val.get("$eq")
        return val
