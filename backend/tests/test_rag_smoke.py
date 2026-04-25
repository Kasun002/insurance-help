"""
test_rag_smoke.py
-----------------
Integration smoke test for the RAG chat pipeline.

Uses FastAPI TestClient so the full app boots (ArticleRepo, VectorRepo,
SearchService, RAGService, ChatService). The only external dependency —
Gemini — is patched to return a deterministic fixture response, so the
test runs without a real API key.
"""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture(scope="module")
def client():
    """Boots the full app once for all tests in this module."""
    app = create_app()
    with TestClient(app) as c:
        yield c


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

FIXTURE_ANSWER = (
    "To file a travel insurance claim, log in to the Great Eastern portal "
    "and navigate to Claims > Travel. Complete the online form and attach "
    "the required documents such as your travel itinerary and receipts. "
    "Sources: [1] Travel Insurance Claims Guide."
)


def _mock_generate(*args, **kwargs):
    """Async mock that returns a canned LLM response."""
    return FIXTURE_ANSWER


# ---------------------------------------------------------------------------
# Smoke tests
# ---------------------------------------------------------------------------


class TestChatSmoke:
    """End-to-end smoke: session create → send message → verify sources."""

    def test_health(self, client: TestClient):
        """Sanity check that the app boots correctly."""
        r = client.get("/api/v1/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_create_session(self, client: TestClient):
        """POST /chat/sessions returns a session_id."""
        r = client.post("/api/v1/chat/sessions", json={})
        assert r.status_code == 201
        body = r.json()
        assert "session_id" in body
        assert body["session_id"].startswith("sess_")

    def test_send_message_returns_sources(self, client: TestClient):
        """
        Core smoke test: send a known travel-claim question and assert
        that the response is well-formed and sources list is non-empty.

        Gemini's generate() is mocked so the test is hermetic — no API key
        required. Vector retrieval and prompt construction run for real.
        """
        with patch(
            "app.core.llm_client.GeminiClient.generate",
            new=AsyncMock(return_value=FIXTURE_ANSWER),
        ):
            # 1. Create session
            session_r = client.post("/api/v1/chat/sessions", json={})
            assert session_r.status_code == 201
            session_id = session_r.json()["session_id"]

            # 2. Send a question that should match ingested articles
            msg_r = client.post(
                f"/api/v1/chat/sessions/{session_id}/messages",
                json={"message": "How do I file a travel insurance claim?"},
            )
            assert msg_r.status_code == 200, msg_r.text

            body = msg_r.json()

            # Response structure
            assert body["role"] == "assistant"
            assert body["session_id"] == session_id
            assert isinstance(body["content"], str) and len(body["content"]) > 0

            # Sources must be non-empty (retrieval ran against real ChromaDB)
            assert isinstance(body["sources"], list), "sources field missing"
            assert len(body["sources"]) > 0, "Expected at least one source citation"

            # Each source has the required fields
            for src in body["sources"]:
                assert "article_id" in src
                assert "title" in src
                assert "relevance" in src

            # Usage metadata
            assert body["usage"]["retrieved_chunks"] > 0

    def test_send_message_appended_to_history(self, client: TestClient):
        """
        Multi-turn: after sending two messages, GET /messages returns both
        user turns and both assistant turns in correct order.
        """
        with patch(
            "app.core.llm_client.GeminiClient.generate",
            new=AsyncMock(return_value=FIXTURE_ANSWER),
        ):
            session_r = client.post("/api/v1/chat/sessions", json={})
            session_id = session_r.json()["session_id"]

            client.post(
                f"/api/v1/chat/sessions/{session_id}/messages",
                json={"message": "What documents do I need to make a claim?"},
            )
            client.post(
                f"/api/v1/chat/sessions/{session_id}/messages",
                json={"message": "How long does it take to process?"},
            )

            history_r = client.get(f"/api/v1/chat/sessions/{session_id}/messages")
            assert history_r.status_code == 200

            messages = history_r.json()["messages"]
            roles = [m["role"] for m in messages]

            # Expect: user, assistant, user, assistant
            assert roles == ["user", "assistant", "user", "assistant"], (
                f"Unexpected role sequence: {roles}"
            )

    def test_unknown_session_returns_404(self, client: TestClient):
        """GET /messages for a non-existent session returns 404."""
        r = client.get("/api/v1/chat/sessions/sess_doesnotexist/messages")
        assert r.status_code == 404
        assert r.json()["error"]["code"] == "NOT_FOUND"

    def test_empty_message_returns_400(self, client: TestClient):
        """POST /messages with empty body returns 400."""
        session_r = client.post("/api/v1/chat/sessions", json={})
        session_id = session_r.json()["session_id"]

        r = client.post(
            f"/api/v1/chat/sessions/{session_id}/messages",
            json={"message": "   "},
        )
        assert r.status_code == 400
        assert r.json()["error"]["code"] == "VALIDATION_ERROR"

    def test_oversized_message_returns_4xx(self, client: TestClient):
        """POST /messages with message > 2000 chars returns 400 or 422."""
        session_r = client.post("/api/v1/chat/sessions", json={})
        session_id = session_r.json()["session_id"]

        r = client.post(
            f"/api/v1/chat/sessions/{session_id}/messages",
            json={"message": "x" * 2001},
        )
        # Pydantic schema enforces max_length=2000 → 422; service double-checks → 400
        assert r.status_code in (400, 422)

    def test_search_empty_query_returns_400(self, client: TestClient):
        """GET /search?q= with empty q returns 400."""
        r = client.get("/api/v1/search?q=")
        assert r.status_code == 400

    def test_unknown_category_returns_404(self, client: TestClient):
        """GET /categories/{id} for unknown id returns 404."""
        r = client.get("/api/v1/categories/cat_does_not_exist")
        assert r.status_code == 404
        assert r.json()["error"]["code"] == "NOT_FOUND"
