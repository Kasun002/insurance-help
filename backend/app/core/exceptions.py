from fastapi import Request
from fastapi.responses import JSONResponse


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

    `reason` is for internal logging only — never surfaced to the user.
    User-facing `message` is always generic to avoid revealing detection logic.
    """
    REASONS = frozenset({"pii", "off_topic", "injection", "unsafe_output"})

    def __init__(
        self,
        reason: str,
        message: str = "Your request could not be processed. Please rephrase and try again.",
    ):
        self.reason = reason  # internal only
        super().__init__(code="GUARDRAIL_BLOCKED", message=message, status_code=400)


# FastAPI exception handlers — registered in main.py

async def app_error_handler(request: Request, exc: Exception) -> JSONResponse:
    err = exc if isinstance(exc, AppError) else AppError("INTERNAL_ERROR", str(exc))
    headers = {}
    if isinstance(err, RateLimitError):
        headers["Retry-After"] = "10"
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
