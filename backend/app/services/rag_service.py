"""
rag_service.py
--------------
RAG pipeline: retrieve relevant chunks → build grounded prompt → generate via Gemini.

6-step pipeline per be-task.md Phase 6.4:
  1. Build optional Chroma `where` filter from seed_article_id
  2. Similarity search ChromaDB top_k=5
  3. Dedupe chunks by article_id — keep highest-scoring chunk per article
  4. Build context string (section header + chunk text)
  5. Build full prompt: system + RAG template with context + history + query
  6. Call Gemini → assemble RAGResponse with sources + usage
"""

import time
from dataclasses import dataclass, field

from app.core.llm_client import BaseLLMClient
from app.core.prompts import SYSTEM_PROMPT, build_rag_prompt, format_history
from app.models.domain import Chunk, Message
from app.repositories.base import BaseArticleRepo, BaseVectorRepo


@dataclass
class SourceRef:
    article_id: str
    slug: str
    title: str
    section: str
    relevance: float


@dataclass
class RAGResponse:
    content: str
    sources: list[SourceRef] = field(default_factory=list)
    retrieved_chunks: int = 0
    latency_ms: int = 0


class RAGService:
    def __init__(
        self,
        vector_repo: BaseVectorRepo,
        llm_client: BaseLLMClient,
        article_repo: BaseArticleRepo,
        top_k: int = 5,
    ) -> None:
        self._vector = vector_repo
        self._llm = llm_client
        self._articles = article_repo
        self._top_k = top_k

    async def answer(
        self,
        query: str,
        chat_history: list[Message] | None = None,
        seed_article_id: str | None = None,
    ) -> RAGResponse:
        t0 = time.perf_counter()
        history = chat_history or []

        # ── 1. Optional Chroma where filter ───────────────────────────────────
        where: dict | None = None
        if seed_article_id:
            where = {"article_id": seed_article_id}

        # ── 2. Similarity search ───────────────────────────────────────────────
        chunks: list[Chunk] = self._vector.similarity_search(
            query, top_k=self._top_k, where=where
        )

        # ── 3. Dedupe by article_id — keep highest-scoring chunk ───────────────
        seen: dict[str, Chunk] = {}
        for chunk in sorted(chunks, key=lambda c: c.score, reverse=True):
            aid = chunk.metadata.get("article_id", "")
            if aid and aid not in seen:
                seen[aid] = chunk

        unique_chunks = list(seen.values())

        # ── 4. Build context string ────────────────────────────────────────────
        context = self._build_context(unique_chunks)

        # ── 5. Build prompt ────────────────────────────────────────────────────
        history_dicts = [{"role": m.role, "content": m.content} for m in history]
        prompt = build_rag_prompt(
            context=context,
            history=format_history(history_dicts),
            query=query,
        )

        # ── 6. Generate ────────────────────────────────────────────────────────
        content = await self._llm.generate(prompt=prompt, system=SYSTEM_PROMPT)

        latency_ms = int((time.perf_counter() - t0) * 1000)

        sources = self._build_sources(unique_chunks)

        return RAGResponse(
            content=content,
            sources=sources,
            retrieved_chunks=len(chunks),
            latency_ms=latency_ms,
        )

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _build_context(self, chunks: list[Chunk]) -> str:
        """Format deduplicated chunks into a numbered context block."""
        sections: list[str] = []
        for i, chunk in enumerate(chunks, 1):
            header = chunk.metadata.get("section_header", "")
            title = chunk.metadata.get("article_title", "")
            label = f"{title} — {header}" if header else title
            sections.append(f"[{i}] {label}\n{chunk.document}")
        return "\n\n---\n\n".join(sections)

    def _build_sources(self, chunks: list[Chunk]) -> list[SourceRef]:
        sources: list[SourceRef] = []
        for chunk in chunks:
            aid = chunk.metadata.get("article_id", "")
            article = self._articles.get_article(aid)
            if article is None:
                continue
            sources.append(
                SourceRef(
                    article_id=article.id,
                    slug=article.slug,
                    title=article.title,
                    section=chunk.metadata.get("section_header", ""),
                    relevance=round(chunk.score, 4),
                )
            )
        return sources
