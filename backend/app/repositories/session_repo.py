"""
session_repo.py
---------------
In-memory session store with 2-hour TTL.
Sessions are lost on server restart — documented tradeoff.
"""

import uuid
from datetime import datetime, timezone

from app.models.domain import Message, Session

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _now_ts() -> float:
    return datetime.now(timezone.utc).timestamp()


class SessionRepo:
    def __init__(self, ttl_seconds: int = 7200) -> None:
        self._ttl_seconds = ttl_seconds
        self._sessions: dict[str, Session] = {}
        self._last_active: dict[str, float] = {}

    def create(self, seed_article_id: str | None = None) -> Session:
        session_id = f"sess_{uuid.uuid4().hex[:12]}"
        session = Session(
            session_id=session_id,
            created_at=_now_iso(),
            seed_article_id=seed_article_id,
            messages=[],
            last_active=_now_iso(),
        )
        self._sessions[session_id] = session
        self._last_active[session_id] = _now_ts()
        return session

    def get(self, session_id: str) -> Session | None:
        session = self._sessions.get(session_id)
        if session is None:
            return None
        # TTL check
        last = self._last_active.get(session_id, 0.0)
        if _now_ts() - last > self._ttl_seconds:
            del self._sessions[session_id]
            del self._last_active[session_id]
            return None
        return session

    def append_message(self, session_id: str, message: Message) -> None:
        session = self._sessions.get(session_id)
        if session is None:
            return
        session.messages.append(message)
        session.last_active = _now_iso()
        self._last_active[session_id] = _now_ts()

    def get_messages(self, session_id: str) -> list[Message]:
        session = self.get(session_id)
        if session is None:
            return []
        return list(session.messages)
