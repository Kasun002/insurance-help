"""
base.py
-------
Abstract base classes for all repository implementations.
Swap local (TinyDB/ChromaDB) ↔ prod (MongoDB/pgvector) without touching services.
"""

from abc import ABC, abstractmethod

from app.models.domain import (
    Article,
    Attachment,
    Category,
    ChecklistItem,
    Chunk,
    Contact,
    Step,
    Subcategory,
)


# ── Article repo interface ─────────────────────────────────────────────────────


class BaseArticleRepo(ABC):

    @abstractmethod
    def get_all_categories(self) -> list[Category]: ...

    @abstractmethod
    def get_category(self, category_id: str) -> Category | None: ...

    @abstractmethod
    def get_articles(
        self,
        category_id: str,
        subcategory_id: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[Article], int]: ...

    @abstractmethod
    def get_article(self, article_id_or_slug: str) -> Article | None: ...

    @abstractmethod
    def get_articles_by_ids(self, ids: list[str]) -> list[Article]: ...

    @abstractmethod
    def get_related_articles(self, article: Article, limit: int = 3) -> list[str]: ...

    @abstractmethod
    def get_stats(self) -> dict: ...

    # ── Shared dict → domain conversion helpers ────────────────────────────────
    # Both TinyDB and MongoDB store documents as plain dicts, so these helpers
    # are shared across all article repo implementations.

    @staticmethod
    def _dict_to_category(raw: dict) -> Category:
        subcategories = [
            Subcategory(
                id=s["id"],
                name=s["name"],
                article_count=s.get("article_count", 0),
            )
            for s in raw.get("subcategories", [])
        ]
        return Category(
            id=raw["id"],
            name=raw["name"],
            icon=raw.get("icon", ""),
            description=raw.get("description", ""),
            subcategories=subcategories,
            article_count=raw.get("article_count", 0),
        )

    @staticmethod
    def _dict_to_article(raw: dict) -> Article:
        steps = [
            Step(order=s["order"], title=s["title"], body=s["body"])
            for s in raw.get("steps", [])
        ]
        checklists = [
            ChecklistItem(scenario=c["scenario"], documents=c["documents"])
            for c in raw.get("document_checklists", [])
        ]
        attachments = [
            Attachment(
                type=a["type"],
                label=a["label"],
                url=a["url"],
                size_kb=a.get("size_kb"),
            )
            for a in raw.get("attachments", [])
        ]
        contact_raw = raw.get("contact")
        contact = (
            Contact(
                phone=contact_raw.get("phone"),
                postal_address=contact_raw.get("postal_address"),
            )
            if contact_raw
            else None
        )
        return Article(
            id=raw["id"],
            slug=raw["slug"],
            title=raw["title"],
            category_id=raw["category_id"],
            subcategory_id=raw["subcategory_id"],
            summary=raw.get("summary", ""),
            content_markdown=raw.get("content_markdown", ""),
            steps=steps,
            document_checklists=checklists,
            attachments=attachments,
            contact=contact,
            source_url=raw.get("source_url", ""),
            read_time_min=raw.get("read_time_min", 3),
            updated_at=raw.get("updated_at", ""),
            tags=raw.get("tags", []),
            related_article_ids=raw.get("related_article_ids", []),
        )


# ── Vector repo interface ──────────────────────────────────────────────────────


class BaseVectorRepo(ABC):

    @abstractmethod
    def similarity_search(
        self,
        query: str,
        top_k: int = 5,
        where: dict | None = None,
    ) -> list[Chunk]: ...

    @abstractmethod
    def get_collection_stats(self) -> dict: ...
