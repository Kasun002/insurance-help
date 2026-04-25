"""
search_service.py
-----------------
Hybrid search: vector similarity (ChromaDB) + keyword boost on title match.

Algorithm per be-task.md Phase 5.1:
  1. Embed query with all-MiniLM-L6-v2 (via VectorRepo)
  2. ChromaDB similarity search top_k = limit * 2
  3. Keyword boost: score += 0.15 * title_overlap_ratio per hit
  4. Dedupe by article_id — keep highest-scoring chunk per article
  5. Trim to limit, fetch article metadata from ArticleRepo
  6. Return SearchResult list with 200-char snippet and score
"""

import re
from dataclasses import dataclass

from app.models.domain import Chunk
from app.repositories.base import BaseArticleRepo, BaseVectorRepo


@dataclass
class SearchResult:
    article_id: str
    slug: str
    title: str
    snippet: str
    matched_section: str
    category_id: str
    category_name: str
    subcategory_id: str
    subcategory_name: str
    score: float
    read_time_min: int


class SearchService:
    def __init__(
        self,
        vector_repo: BaseVectorRepo,
        article_repo: BaseArticleRepo,
        keyword_boost: float = 0.15,
        snippet_max_len: int = 200,
    ) -> None:
        self._vector = vector_repo
        self._articles = article_repo
        self._keyword_boost = keyword_boost
        self._snippet_max_len = snippet_max_len

    def search(self, query: str, limit: int = 10) -> list[SearchResult]:
        if not query.strip():
            return []

        # ── 1 + 2. Vector similarity search ──────────────────────────────────
        raw_hits: list[Chunk] = self._vector.similarity_search(
            query, top_k=limit * 2
        )
        if not raw_hits:
            return []

        # ── 3. Keyword boost on title ─────────────────────────────────────────
        query_tokens = set(re.findall(r"[a-z]+", query.lower()))
        boosted: list[Chunk] = []
        for hit in raw_hits:
            title = hit.metadata.get("article_title", "")
            title_tokens = set(re.findall(r"[a-z]+", title.lower()))
            overlap = len(query_tokens & title_tokens) / max(len(query_tokens), 1)
            hit.score = round(hit.score + self._keyword_boost * overlap, 4)
            boosted.append(hit)

        # ── 4. Dedupe by article_id — keep highest-scoring chunk ──────────────
        seen: dict[str, Chunk] = {}
        for hit in sorted(boosted, key=lambda h: h.score, reverse=True):
            aid = hit.metadata.get("article_id", "")
            if aid and aid not in seen:
                seen[aid] = hit
            if len(seen) >= limit:
                break

        # ── 5. Fetch full article metadata from ArticleRepo ───────────────────
        results: list[SearchResult] = []
        for chunk in seen.values():
            aid = chunk.metadata.get("article_id", "")
            article = self._articles.get_article(aid)
            if article is None:
                continue

            # Resolve category/subcategory display names
            cat = self._articles.get_category(article.category_id)
            cat_name = cat.name if cat else article.category_id
            sub_name = article.subcategory_id
            if cat:
                for sub in cat.subcategories:
                    if sub.id == article.subcategory_id:
                        sub_name = sub.name
                        break

            # ── 6. Build 200-char snippet from the matched chunk ──────────────
            snippet = self._make_snippet(chunk.document, query, self._snippet_max_len)

            results.append(
                SearchResult(
                    article_id=article.id,
                    slug=article.slug,
                    title=article.title,
                    snippet=snippet,
                    matched_section=chunk.metadata.get("section_header", ""),
                    category_id=article.category_id,
                    category_name=cat_name,
                    subcategory_id=article.subcategory_id,
                    subcategory_name=sub_name,
                    score=chunk.score,
                    read_time_min=article.read_time_min,
                )
            )

        # Re-sort by final boosted score (dedupe dict preserves insertion, not score order)
        results.sort(key=lambda r: r.score, reverse=True)
        return results

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _make_snippet(chunk_text: str, query: str, max_len: int = 200) -> str:
        """
        Extract the most relevant 200-char window from the chunk.
        Tries to centre the window on the first query-term match.
        Strips markdown headings from the snippet.
        """
        # Strip markdown headings and excess whitespace
        clean = re.sub(r"^#{1,6}\s+.+$", "", chunk_text, flags=re.MULTILINE)
        clean = re.sub(r"\s+", " ", clean).strip()

        if len(clean) <= max_len:
            return clean

        # Find first occurrence of any query token
        query_tokens = re.findall(r"[a-z]+", query.lower())
        best_pos = len(clean)  # fallback: start of text
        for token in query_tokens:
            match = re.search(re.escape(token), clean.lower())
            if match and match.start() < best_pos:
                best_pos = match.start()

        # Centre window around the match
        half = max_len // 2
        start = max(0, best_pos - half)
        end = min(len(clean), start + max_len)
        # Adjust start if we hit the end boundary
        start = max(0, end - max_len)

        snippet = clean[start:end].strip()
        if start > 0:
            snippet = "..." + snippet
        if end < len(clean):
            snippet = snippet + "..."
        return snippet
