from fastapi import APIRouter, Depends, Query

from app.api.deps import get_article_repo
from app.config import get_settings
from app.core.exceptions import NotFoundError
from app.models.domain import Article, Category
from app.models.schemas import (
    ArticleDetailResponse,
    ArticleListResponse,
    ArticleSummary,
    AttachmentSchema,
    BreadcrumbItem,
    CategoryRef,
    ChecklistSchema,
    ContactSchema,
    StepSchema,
    SubcategoryRef,
)
from app.repositories.article_repo import ArticleRepo

router = APIRouter(tags=["articles"])

_s = get_settings()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_breadcrumb(article: Article, repo: ArticleRepo) -> list[BreadcrumbItem]:
    cat = repo.get_category(article.category_id)
    cat_name = cat.name if cat else article.category_id

    # Find subcategory name
    sub_name = article.subcategory_id
    if cat:
        for sub in cat.subcategories:
            if sub.id == article.subcategory_id:
                sub_name = sub.name
                break

    return [
        BreadcrumbItem(label="Home", href="/"),
        BreadcrumbItem(label=cat_name, href=f"/category/{article.category_id}"),
        BreadcrumbItem(
            label=sub_name,
            href=f"/category/{article.category_id}?subcategory={article.subcategory_id}",
        ),
        BreadcrumbItem(label=article.title, href=None),
    ]


def _article_to_summary(article: Article, repo: ArticleRepo) -> ArticleSummary:
    cat = repo.get_category(article.category_id)
    sub_name = article.subcategory_id
    if cat:
        for sub in cat.subcategories:
            if sub.id == article.subcategory_id:
                sub_name = sub.name
                break

    return ArticleSummary(
        id=article.id,
        slug=article.slug,
        title=article.title,
        summary=article.summary,
        subcategory=SubcategoryRef(id=article.subcategory_id, name=sub_name),
        read_time_min=article.read_time_min,
        has_attachments=bool(article.attachments),
        updated_at=article.updated_at,
    )


def _article_to_detail(article: Article, repo: ArticleRepo) -> ArticleDetailResponse:
    cat = repo.get_category(article.category_id)
    cat_name = cat.name if cat else article.category_id
    sub_name = article.subcategory_id
    if cat:
        for sub in cat.subcategories:
            if sub.id == article.subcategory_id:
                sub_name = sub.name
                break

    related_ids = repo.get_related_articles(article, limit=_s.ARTICLE_RELATED_LIMIT)

    return ArticleDetailResponse(
        id=article.id,
        slug=article.slug,
        title=article.title,
        summary=article.summary,
        content_markdown=article.content_markdown,
        category=CategoryRef(id=article.category_id, name=cat_name),
        subcategory=SubcategoryRef(id=article.subcategory_id, name=sub_name),
        breadcrumb=_build_breadcrumb(article, repo),
        steps=[StepSchema(order=s.order, title=s.title, body=s.body) for s in article.steps],
        document_checklists=[
            ChecklistSchema(scenario=c.scenario, documents=c.documents)
            for c in article.document_checklists
        ],
        attachments=[
            AttachmentSchema(
                type=a.type, label=a.label, url=a.url, size_kb=a.size_kb
            )
            for a in article.attachments
        ],
        contact=ContactSchema(
            phone=article.contact.phone,
            postal_address=article.contact.postal_address,
        ) if article.contact else None,
        related_article_ids=related_ids,
        source_url=article.source_url,
        read_time_min=article.read_time_min,
        updated_at=article.updated_at,
        tags=article.tags,
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/categories/{category_id}/articles", response_model=ArticleListResponse)
def list_articles(
    category_id: str,
    subcategory: str | None = Query(default=None),
    limit: int = Query(default=_s.ARTICLE_DEFAULT_LIMIT, ge=1, le=_s.ARTICLE_MAX_LIMIT),
    offset: int = Query(default=0, ge=0),
    repo: ArticleRepo = Depends(get_article_repo),
) -> ArticleListResponse:
    cat = repo.get_category(category_id)
    if cat is None:
        raise NotFoundError(f"Category '{category_id}' not found")

    articles, total = repo.get_articles(
        category_id=category_id,
        subcategory_id=subcategory,
        limit=limit,
        offset=offset,
    )

    return ArticleListResponse(
        category=CategoryRef(id=cat.id, name=cat.name),
        filter={"subcategory": subcategory},
        articles=[_article_to_summary(a, repo) for a in articles],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/articles/{article_id}", response_model=ArticleDetailResponse)
def get_article(
    article_id: str,
    repo: ArticleRepo = Depends(get_article_repo),
) -> ArticleDetailResponse:
    article = repo.get_article(article_id)
    if article is None:
        raise NotFoundError(f"Article '{article_id}' not found")

    return _article_to_detail(article, repo)
