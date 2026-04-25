"""
mongo_article_repo.py
---------------------
Production (MongoDB) implementation of BaseArticleRepo.
Used when ENV=prod.

On first boot, auto-seeds from articles.json if the MongoDB collections are empty.
After seeding, all articles and categories are loaded into memory dicts for O(1)
lookups — same performance profile as the local TinyDB implementation.
"""

import json
from pathlib import Path

from pymongo import MongoClient

from app.models.domain import Article, Category
from app.repositories.base import BaseArticleRepo


class MongoArticleRepo(BaseArticleRepo):
    def __init__(
        self,
        mongodb_uri: str,
        articles_json_path: str,
        db_name: str = "insurance_help",
    ) -> None:
        client = MongoClient(mongodb_uri)
        db = client[db_name]
        self._articles_col = db["articles"]
        self._categories_col = db["categories"]

        # Seed from baked-in articles.json on first deploy
        self._seed_if_empty(articles_json_path)

        # Load everything into memory for O(1) access (50 articles — fine in RAM)
        self._articles_raw: list[dict] = list(
            self._articles_col.find({}, {"_id": 0})
        )
        self._categories_raw: list[dict] = list(
            self._categories_col.find({}, {"_id": 0})
        )
        self._articles_by_id: dict[str, dict] = {
            a["id"]: a for a in self._articles_raw
        }
        self._articles_by_slug: dict[str, dict] = {
            a["slug"]: a for a in self._articles_raw
        }

    # ── Seeding ───────────────────────────────────────────────────────────────

    def _seed_if_empty(self, articles_json_path: str) -> None:
        """Populate MongoDB from articles.json when collections are empty."""
        if self._articles_col.count_documents({}) > 0:
            return  # already seeded

        path = Path(articles_json_path)
        if not path.exists():
            raise FileNotFoundError(
                f"articles.json not found at {path}. "
                "Cannot auto-seed MongoDB — ensure the file is baked into the image."
            )

        data = json.loads(path.read_text(encoding="utf-8"))
        articles = data.get("articles", [])
        categories = data.get("categories", [])

        if articles:
            self._articles_col.insert_many(articles)
        if categories:
            self._categories_col.insert_many(categories)

        print(
            f"[MongoArticleRepo] Seeded {len(articles)} articles "
            f"and {len(categories)} categories into MongoDB."
        )

    # ── Categories ────────────────────────────────────────────────────────────

    def get_all_categories(self) -> list[Category]:
        return [self._dict_to_category(c) for c in self._categories_raw]

    def get_category(self, category_id: str) -> Category | None:
        for c in self._categories_raw:
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
        filtered = [
            a for a in self._articles_raw
            if a["category_id"] == category_id
            and (subcategory_id is None or a["subcategory_id"] == subcategory_id)
        ]
        total = len(filtered)
        page = filtered[offset: offset + limit]
        return [self._dict_to_article(a) for a in page], total

    def get_article(self, article_id_or_slug: str) -> Article | None:
        raw = self._articles_by_id.get(article_id_or_slug)
        if raw is None:
            raw = self._articles_by_slug.get(article_id_or_slug)
        return self._dict_to_article(raw) if raw else None

    def get_articles_by_ids(self, ids: list[str]) -> list[Article]:
        result = []
        for aid in ids:
            raw = self._articles_by_id.get(aid)
            if raw:
                result.append(self._dict_to_article(raw))
        return result

    def get_related_articles(self, article: Article, limit: int = 3) -> list[str]:
        related = [
            a["id"]
            for a in self._articles_raw
            if a["category_id"] == article.category_id
            and a["subcategory_id"] == article.subcategory_id
            and a["id"] != article.id
        ]
        return related[:limit]

    # ── Stats ─────────────────────────────────────────────────────────────────

    def get_stats(self) -> dict:
        return {
            "article_count": len(self._articles_raw),
            "category_count": len(self._categories_raw),
        }
