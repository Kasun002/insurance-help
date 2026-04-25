from fastapi import APIRouter, Depends, Header

from app.api.deps import get_chat_service
from app.models.schemas import (
    ChatMessageResponse,
    CreateSessionRequest,
    CreateSessionResponse,
    MessageItem,
    SeedArticleRef,
    SendMessageRequest,
    SessionMessagesResponse,
    SourceCitation,
    UsageInfo,
)
from app.services.chat_service import ChatService

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/sessions", response_model=CreateSessionResponse, status_code=201)
async def create_session(
    body: CreateSessionRequest = CreateSessionRequest(),
    service: ChatService = Depends(get_chat_service),
) -> CreateSessionResponse:
    session = service.create_session(seed_article_id=body.seed_article_id)

    seed_article = None
    if session.seed_article_id:
        article = service.get_article(session.seed_article_id)
        if article:
            seed_article = SeedArticleRef(id=article.id, title=article.title)

    return CreateSessionResponse(
        session_id=session.session_id,
        created_at=session.created_at,
        seed_article=seed_article,
    )


@router.post(
    "/sessions/{session_id}/messages",
    response_model=ChatMessageResponse,
)
async def send_message(
    session_id: str,
    body: SendMessageRequest,
    x_session_id: str | None = Header(default=None),
    service: ChatService = Depends(get_chat_service),
) -> ChatMessageResponse:
    # Accept session_id from URL path (primary) or X-Session-Id header (fallback)
    resolved_session_id = session_id if session_id != "_" else (x_session_id or session_id)

    rag_response = await service.send_message(
        session_id=resolved_session_id,
        user_content=body.message,
    )

    # Get the assistant message that was just appended to retrieve its ID
    messages = service.get_messages(resolved_session_id)
    assistant_msg = next(
        (m for m in reversed(messages) if m.role == "assistant"), None
    )
    message_id = assistant_msg.id if assistant_msg else f"msg_{resolved_session_id}"

    return ChatMessageResponse(
        message_id=message_id,
        session_id=resolved_session_id,
        role="assistant",
        content=rag_response.content,
        sources=[
            SourceCitation(
                article_id=s.article_id,
                slug=s.slug,
                title=s.title,
                section=s.section,
                relevance=s.relevance,
            )
            for s in rag_response.sources
        ],
        usage=UsageInfo(
            retrieved_chunks=rag_response.retrieved_chunks,
            latency_ms=rag_response.latency_ms,
        ),
        created_at=assistant_msg.created_at if assistant_msg else "",
    )


@router.get(
    "/sessions/{session_id}/messages",
    response_model=SessionMessagesResponse,
)
def get_session_messages(
    session_id: str,
    service: ChatService = Depends(get_chat_service),
) -> SessionMessagesResponse:
    messages = service.get_messages(session_id)
    return SessionMessagesResponse(
        session_id=session_id,
        messages=[
            MessageItem(
                id=m.id,
                role=m.role,
                content=m.content,
                sources=[
                    SourceCitation(**s) for s in (m.sources or [])
                ],
                created_at=m.created_at,
            )
            for m in messages
        ],
    )
