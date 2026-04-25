from fastapi import APIRouter, Depends, Query

from app.api.deps import get_input_guardrail, get_search_service
from app.config import get_settings
from app.core.exceptions import GuardrailError, ValidationError
from app.core.guardrails import BaseInputGuardrail
from app.models.schemas import CategoryRef, SearchResponse, SearchResultItem, SubcategoryRef
from app.services.search_service import SearchService

router = APIRouter(tags=["search"])

_s = get_settings()


@router.get("/search", response_model=SearchResponse)
def search_articles(
    q: str = Query(..., description="Search query"),
    limit: int = Query(default=_s.SEARCH_DEFAULT_LIMIT, ge=1, le=_s.SEARCH_MAX_LIMIT),
    service: SearchService = Depends(get_search_service),
    input_guardrail: BaseInputGuardrail = Depends(get_input_guardrail),
) -> SearchResponse:
    if not q.strip():
        raise ValidationError("Query parameter 'q' must not be empty")
    if len(q) > _s.SEARCH_QUERY_MAX_LEN:
        raise ValidationError(f"Query parameter 'q' must be {_s.SEARCH_QUERY_MAX_LEN} characters or fewer")

    if get_settings().GUARDRAILS_ENABLED:
        guard_result = input_guardrail.check(q.strip())
        if not guard_result.passed:
            raise GuardrailError(reason=guard_result.reason or "blocked")

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
