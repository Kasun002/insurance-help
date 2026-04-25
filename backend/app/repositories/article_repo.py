"""
article_repo.py
---------------
Local (TinyDB / JSON file) implementation of BaseArticleRepo.
Used when ENV=local (default). For production use MongoArticleRepo.
"""

import json
from pathlib import Path

from app.models.domain import Article, Category
from app.repositories.base import BaseArticleRepo


class ArticleRepo(BaseArticleRepo):
    def __init__(self, db_path: str) -> None:
        path = Path(db_path)
        if not path.exists():
            raise FileNotFoundError(
                f"articles.json not found at {path}. "
                "Run scripts/synthesize_articles.py first."
            )
        raw = json.loads(path.read_text(encoding="utf-8"))
        self._articles: list[dict] = raw.get("articles", [])
        self._categories: list[dict] = raw.get("categories", [])

        # Build lookup indices for O(1) access
        self._articles_by_id: dict[str, dict] = {a["id"]: a for a in self._articles}
        self._articles_by_slug: dict[str, dict] = {a["slug"]: a for a in self._articles}

    # ── Categories ────────────────────────────────────────────────────────────

    def get_all_categories(self) -> list[Category]:
        return [self._dict_to_category(c) for c in self._categories]

    def get_category(self, category_id: str) -> Category | None:
        for c in self._categories:
            if c["id"] == category_id:
                return self._dict_to_category(c)
        return None

    # ── Articles ──────────────────────────────────────────────────────────────

    def get_articles(
        self,
        category_id: str,
        subcategory_id: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[Article], int]:
        """
        List articles in a category, optionally filtered by subcategory.
        Returns (page, total_count).
        """
        filtered = [
            a for a in self._articles
            if a["category_id"] == category_id
            and (subcategory_id is None or a["subcategory_id"] == subcategory_id)
        ]
        total = len(filtered)
        page = filtered[offset : offset + limit]
        return [self._dict_to_article(a) for a in page], total

    def get_article(self, article_id_or_slug: str) -> Article | None:
        """Resolve by id first, then by slug."""
        raw = self._articles_by_id.get(article_id_or_slug)
        if raw is None:
            raw = self._articles_by_slug.get(article_id_or_slug)
        return self._dict_to_article(raw) if raw else None

    def get_articles_by_ids(self, ids: list[str]) -> list[Article]:
        """Bulk fetch by article id list. Preserves order, skips missing."""
        result = []
        for aid in ids:
            raw = self._articles_by_id.get(aid)
            if raw:
                result.append(self._dict_to_article(raw))
        return result

    def get_related_articles(
        self,
        article: Article,
        limit: int = 3,
    ) -> list[str]:
        """
        Return up to `limit` article IDs from the same subcategory,
        excluding the article itself.
        """
        related = [
            a["id"]
            for a in self._articles
            if a["category_id"] == article.category_id
            and a["subcategory_id"] == article.subcategory_id
            and a["id"] != article.id
        ]
        return related[:limit]

    # ── Stats ─────────────────────────────────────────────────────────────────

    def get_stats(self) -> dict:
        return {
            "article_count": len(self._articles),
            "category_count": len(self._categories),
        }

    # _dict_to_category and _dict_to_article are inherited from BaseArticleRepo
