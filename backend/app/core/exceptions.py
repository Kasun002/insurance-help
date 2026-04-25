from fastapi import Request
from fastapi.responses import JSONResponse

from app.config import get_settings


class AppError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 500):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(code="NOT_FOUND", message=message, status_code=404)


class ValidationError(AppError):
    def __init__(self, message: str = "Invalid request"):
        super().__init__(code="VALIDATION_ERROR", message=message, status_code=400)


class LLMError(AppError):
    def __init__(self, message: str = "LLM request failed"):
        super().__init__(code="LLM_ERROR", message=message, status_code=502)


class RateLimitError(LLMError):
    def __init__(self, message: str = "LLM rate limit exceeded — please retry shortly"):
        self.code = "RATE_LIMIT"
        self.message = message
        self.status_code = 429
        Exception.__init__(self, message)


class GuardrailError(AppError):
    """
    Raised when input or output guardrails block a request.

    `reason` drives the user-facing code and message.
    Injection reason is intentionally vague to avoid revealing detection logic.
    """

    _REASON_MAP: dict[str, tuple[str, str]] = {
        "pii": (
            "GUARDRAIL_PII",
            "Your message appears to contain personal information (such as an ID number, "
            "phone number, or card number). Please remove it and try again.",
        ),
        "off_topic": (
            "GUARDRAIL_OFF_TOPIC",
            "This assistant only answers questions about Great Eastern insurance products "
            "and services. Please ask an insurance-related question.",
        ),
        "injection": (
            "GUARDRAIL_BLOCKED",
            "Your request could not be processed. Please rephrase and try again.",
        ),
        "unsafe_output": (
            "GUARDRAIL_BLOCKED",
            "Your request could not be processed. Please rephrase and try again.",
        ),
    }

    def __init__(self, reason: str):
        self.reason = reason  # internal only — used for logging
        code, message = self._REASON_MAP.get(
            reason,
            ("GUARDRAIL_BLOCKED", "Your request could not be processed. Please rephrase and try again."),
        )
        super().__init__(code=code, message=message, status_code=400)


# FastAPI exception handlers — registered in main.py

async def app_error_handler(request: Request, exc: Exception) -> JSONResponse:
    err = exc if isinstance(exc, AppError) else AppError("INTERNAL_ERROR", str(exc))
    headers = {}
    if isinstance(err, RateLimitError):
        headers["Retry-After"] = str(get_settings().LLM_RETRY_AFTER_SECONDS)
    return JSONResponse(
        status_code=err.status_code,
        content={"error": {"code": err.code, "message": err.message}},
        headers=headers,
    )


async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred"}},
    )
