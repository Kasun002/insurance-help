"""
llm_client.py
-------------
Async Gemini wrapper with exponential backoff retry on rate-limit / server errors.
"""

import asyncio
import logging
import time

import google.generativeai as genai

from app.core.exceptions import LLMError, RateLimitError

logger = logging.getLogger(__name__)

_RETRYABLE_STATUS = {"429", "503", "500"}


class GeminiClient:
    def __init__(self, api_key: str, model_name: str) -> None:
        genai.configure(api_key=api_key)
        self._model_name = model_name

    async def generate(
        self,
        prompt: str,
        system: str = "",
        max_retries: int = 3,
        temperature: float = 0.2,
    ) -> str:
        """
        Generate a response from Gemini.

        Retries up to max_retries times with exponential backoff on 429 / 503.
        Raises RateLimitError or LLMError on unrecoverable failure.
        """
        model = genai.GenerativeModel(
            model_name=self._model_name,
            system_instruction=system or None,
        )

        last_exc: Exception | None = None
        for attempt in range(1, max_retries + 1):
            t0 = time.perf_counter()
            try:
                # google-generativeai is synchronous; run in thread pool
                response = await asyncio.to_thread(
                    model.generate_content,
                    prompt,
                    generation_config=genai.GenerationConfig(temperature=temperature),
                )
                latency_ms = int((time.perf_counter() - t0) * 1000)
                logger.info(
                    "Gemini response: model=%s latency=%dms attempt=%d",
                    self._model_name,
                    latency_ms,
                    attempt,
                )
                return response.text

            except Exception as exc:
                last_exc = exc
                exc_str = str(exc)
                is_rate_limit = "429" in exc_str or "quota" in exc_str.lower() or "rate" in exc_str.lower()
                is_retryable = is_rate_limit or "503" in exc_str or "500" in exc_str

                if not is_retryable or attempt == max_retries:
                    break

                wait = 2 ** attempt  # 2s, 4s, 8s
                logger.warning(
                    "Gemini attempt %d/%d failed (%s) — retrying in %ds",
                    attempt,
                    max_retries,
                    exc_str[:80],
                    wait,
                )
                await asyncio.sleep(wait)

        # Exhausted retries
        exc_str = str(last_exc) if last_exc else "unknown error"
        if "429" in exc_str or "quota" in exc_str.lower() or "rate" in exc_str.lower():
            raise RateLimitError(
                "Gemini rate limit reached. Please wait a moment and try again."
            )
        raise LLMError(f"Gemini generation failed after {max_retries} attempts: {exc_str[:200]}")
