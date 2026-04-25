"""
chat_service.py
---------------
Orchestrates session lifecycle and message handling.
Delegates retrieval + generation to RAGService.
"""

import uuid
from datetime import datetime, timezone

from app.config import get_settings
from app.core.exceptions import GuardrailError, NotFoundError, ValidationError
from app.core.guardrails import BaseInputGuardrail, BaseOutputGuardrail, InputGuardrail, OutputGuardrail
from app.models.domain import Article, Message, Session
from app.repositories.base import BaseArticleRepo
from app.repositories.session_repo import SessionRepo
from app.services.rag_service import RAGResponse, RAGService


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _msg_id() -> str:
    return f"msg_{uuid.uuid4().hex[:8]}"


class ChatService:
    def __init__(
        self,
        session_repo: SessionRepo,
        rag_service: RAGService,
        article_repo: BaseArticleRepo,
        input_guardrail: BaseInputGuardrail | None = None,
        output_guardrail: BaseOutputGuardrail | None = None,
        guardrails_enabled: bool = True,
    ) -> None:
        self._sessions = session_repo
        self._rag = rag_service
        self._articles = article_repo
        self._input_guard = input_guardrail or InputGuardrail()
        self._output_guard = output_guardrail or OutputGuardrail()
        self._guardrails_enabled = guardrails_enabled

    # ── Session ───────────────────────────────────────────────────────────────

    def create_session(self, seed_article_id: str | None = None) -> Session:
        """
        Create a new chat session.
        If seed_article_id is provided, validate it exists first.
        """
        if seed_article_id:
            article = self._articles.get_article(seed_article_id)
            if article is None:
                raise NotFoundError(f"Seed article '{seed_article_id}' not found")

        return self._sessions.create(seed_article_id=seed_article_id)

    def get_session(self, session_id: str) -> Session:
        session = self._sessions.get(session_id)
        if session is None:
            raise NotFoundError(
                f"Session '{session_id}' not found or has expired. "
                "Please start a new session."
            )
        return session

    def get_article(self, article_id: str) -> Article | None:
        """Public delegation — keeps callers from accessing private _articles."""
        return self._articles.get_article(article_id)

    # ── Messaging ─────────────────────────────────────────────────────────────

    async def send_message(
        self,
        session_id: str,
        user_content: str,
    ) -> RAGResponse:
        """
        Append user message, call RAGService with full history,
        append assistant response, return RAGResponse.
        """
        max_len = get_settings().CHAT_MESSAGE_MAX_LEN
        if not user_content.strip():
            raise ValidationError("Message must not be empty")
        if len(user_content) > max_len:
            raise ValidationError(f"Message must be {max_len} characters or fewer")

        # ── Input guardrail ────────────────────────────────────────────────────
        if self._guardrails_enabled:
            result = self._input_guard.check(user_content)
            if not result.passed:
                raise GuardrailError(reason=result.reason or "blocked")

        session = self.get_session(session_id)

        # Append user message
        user_msg = Message(
            id=_msg_id(),
            role="user",
            content=user_content.strip(),
            created_at=_now_iso(),
        )
        self._sessions.append_message(session_id, user_msg)

        # Call RAG with full history (excluding the message we just appended
        # so the model sees it as the current query, not history)
        history = self._sessions.get_messages(session_id)[:-1]

        rag_response = await self._rag.answer(
            query=user_content.strip(),
            chat_history=history,
            seed_article_id=session.seed_article_id,
        )

        # ── Output guardrail ───────────────────────────────────────────────────
        if self._guardrails_enabled:
            rag_response.content = self._output_guard.check(
                content=rag_response.content,
                retrieved_chunks=rag_response.retrieved_chunks,
            )

        # Append assistant message
        assistant_msg = Message(
            id=_msg_id(),
            role="assistant",
            content=rag_response.content,
            created_at=_now_iso(),
            sources=[
                {
                    "article_id": s.article_id,
                    "slug": s.slug,
                    "title": s.title,
                    "section": s.section,
                    "relevance": s.relevance,
                }
                for s in rag_response.sources
            ],
        )
        self._sessions.append_message(session_id, assistant_msg)

        return rag_response

    def get_messages(self, session_id: str) -> list[Message]:
        self.get_session(session_id)  # validates existence
        return self._sessions.get_messages(session_id)
