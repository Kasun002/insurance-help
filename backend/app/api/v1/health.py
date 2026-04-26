from fastapi import APIRouter, Request

from app.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check(request: Request) -> dict:
    ready = hasattr(request.app.state, "article_repo")
    return {
        "status": "ok" if ready else "starting",
        "version": "0.1.0",
        "env": get_settings().ENV,
        "ready": ready,
    }
