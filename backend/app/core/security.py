"""
security.py
-----------
API key authentication dependency.

Local (API_KEY_ENABLED=false): all requests pass through without a key.
Production (API_KEY_ENABLED=true): every protected route requires the header
    X-API-Key: <secret>

The dependency is applied at the router level in app/api/v1/router.py so
individual endpoints need no changes.
"""

from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

from app.config import get_settings

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str | None = Security(_api_key_header)) -> None:
    settings = get_settings()

    if not settings.API_KEY_ENABLED:
        return  # local mode — no auth required

    if not api_key or api_key != settings.API_KEY:
        raise HTTPException(
            status_code=401,
            detail={
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Invalid or missing API key. Provide a valid X-API-Key header.",
                }
            },
        )
