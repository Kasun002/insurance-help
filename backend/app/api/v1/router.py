from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.api.v1.categories import router as categories_router
from app.api.v1.articles import router as articles_router
from app.api.v1.search import router as search_router
from app.api.v1.chat import router as chat_router

router = APIRouter()

router.include_router(health_router)
router.include_router(categories_router)
router.include_router(articles_router)
router.include_router(search_router)
router.include_router(chat_router)
