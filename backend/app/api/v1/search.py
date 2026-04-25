from fastapi import APIRouter, Depends, Query

from app.api.deps import get_search_service
from app.core.exceptions import ValidationError
from app.models.schemas import CategoryRef, SearchResponse, SearchResultItem, SubcategoryRef
from app.services.search_service import SearchService

router = APIRouter(tags=["search"])


@router.get("/search", response_model=SearchResponse)
def search_articles(
    q: str = Query(..., description="Search query"),
    limit: int = Query(default=10, ge=1, le=50),
    service: SearchService = Depends(get_search_service),
) -> SearchResponse:
    if not q.strip():
        raise ValidationError("Query parameter 'q' must not be empty")
    if len(q) > 200:
        raise ValidationError("Query parameter 'q' must be 200 characters or fewer")

    results = service.search(query=q.strip(), limit=limit)

    return SearchResponse(
        query=q.strip(),
        results=[
            SearchResultItem(
                article_id=r.article_id,
                slug=r.slug,
                title=r.title,
                snippet=r.snippet,
                matched_section=r.matched_section,
                category=CategoryRef(id=r.category_id, name=r.category_name),
                subcategory=SubcategoryRef(id=r.subcategory_id, name=r.subcategory_name),
                score=r.score,
                read_time_min=r.read_time_min,
            )
            for r in results
        ],
        total=len(results),
        limit=limit,
    )
