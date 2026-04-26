from fastapi import APIRouter, Depends

from app.api.v1.health import router as health_router
from app.api.v1.categories import router as categories_router
from app.api.v1.articles import router as articles_router
from app.api.v1.search import router as search_router
from app.api.v1.chat import router as chat_router
from app.core.security import verify_api_key

# Public routes — no API key required (health probe must always be reachable)
router = APIRouter()
router.include_router(health_router)

# Protected routes — require X-API-Key header in production (no-op locally)
_protected = APIRouter(dependencies=[Depends(verify_api_key)])
_protected.include_router(categories_router)
_protected.include_router(articles_router)
_protected.include_router(search_router)
_protected.include_router(chat_router)

router.include_router(_protected)
