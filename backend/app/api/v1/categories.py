from fastapi import APIRouter, Depends

from app.api.deps import get_article_repo
from app.core.exceptions import NotFoundError
from app.models.schemas import (
    CategoryDetailResponse,
    CategoryListResponse,
    CategorySummary,
    SubcategoryDetail,
)
from app.repositories.article_repo import ArticleRepo

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=CategoryListResponse)
def list_categories(
    repo: ArticleRepo = Depends(get_article_repo),
) -> CategoryListResponse:
    categories = repo.get_all_categories()
    return CategoryListResponse(
        categories=[
            CategorySummary(
                id=cat.id,
                name=cat.name,
                icon=cat.icon,
                description=cat.description,
                article_count=cat.article_count,
                subcategory_count=len(cat.subcategories),
            )
            for cat in categories
        ]
    )


@router.get("/{category_id}", response_model=CategoryDetailResponse)
def get_category(
    category_id: str,
    repo: ArticleRepo = Depends(get_article_repo),
) -> CategoryDetailResponse:
    cat = repo.get_category(category_id)
    if cat is None:
        raise NotFoundError(f"Category '{category_id}' not found")

    return CategoryDetailResponse(
        id=cat.id,
        name=cat.name,
        icon=cat.icon,
        description=cat.description,
        subcategories=[
            SubcategoryDetail(
                id=sub.id,
                name=sub.name,
                article_count=sub.article_count,
            )
            for sub in cat.subcategories
        ],
    )
