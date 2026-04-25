"""
Pydantic v2 request/response schemas — the public API contract.
Mirrors plan.md Section 5 contracts exactly.
"""

from pydantic import BaseModel, Field


# ── Shared sub-models ────────────────────────────────────────────────────────

class SubcategoryRef(BaseModel):
    id: str
    name: str


class CategoryRef(BaseModel):
    id: str
    name: str


class BreadcrumbItem(BaseModel):
    label: str
    href: str | None


class StepSchema(BaseModel):
    order: int
    title: str
    body: str


class ChecklistSchema(BaseModel):
    scenario: str
    documents: list[str]


class AttachmentSchema(BaseModel):
    type: str
    label: str
    url: str
    size_kb: int | None = None


class ContactSchema(BaseModel):
    phone: str | None = None
    postal_address: str | None = None


# ── Categories ───────────────────────────────────────────────────────────────

class CategorySummary(BaseModel):
    id: str
    name: str
    icon: str
    description: str
    article_count: int
    subcategory_count: int


class CategoryListResponse(BaseModel):
    categories: list[CategorySummary]


class SubcategoryDetail(BaseModel):
    id: str
    name: str
    article_count: int


class CategoryDetailResponse(BaseModel):
    id: str
    name: str
    icon: str
    description: str
    subcategories: list[SubcategoryDetail]


# ── Articles ─────────────────────────────────────────────────────────────────

class ArticleSummary(BaseModel):
    id: str
    slug: str
    title: str
    summary: str
    subcategory: SubcategoryRef
    read_time_min: int
    has_attachments: bool
    updated_at: str


class ArticleListResponse(BaseModel):
    category: CategoryRef
    filter: dict
    articles: list[ArticleSummary]
    total: int
    limit: int
    offset: int


class ArticleDetailResponse(BaseModel):
    id: str
    slug: str
    title: str
    summary: str
    content_markdown: str
    category: CategoryRef
    subcategory: SubcategoryRef
    breadcrumb: list[BreadcrumbItem]
    steps: list[StepSchema]
    document_checklists: list[ChecklistSchema]
    attachments: list[AttachmentSchema]
    contact: ContactSchema | None
    related_article_ids: list[str]
    source_url: str
    read_time_min: int
    updated_at: str
    tags: list[str]


# ── Search ───────────────────────────────────────────────────────────────────

class SearchResultItem(BaseModel):
    article_id: str
    slug: str
    title: str
    snippet: str
    matched_section: str
    category: CategoryRef
    subcategory: SubcategoryRef
    score: float
    read_time_min: int


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResultItem]
    total: int
    limit: int


# ── Chat ─────────────────────────────────────────────────────────────────────

class CreateSessionRequest(BaseModel):
    seed_article_id: str | None = None


class SeedArticleRef(BaseModel):
    id: str
    title: str


class CreateSessionResponse(BaseModel):
    session_id: str
    created_at: str
    seed_article: SeedArticleRef | None = None


class SendMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


class SourceCitation(BaseModel):
    article_id: str
    slug: str
    title: str
    section: str
    relevance: float


class UsageInfo(BaseModel):
    retrieved_chunks: int
    latency_ms: int


class ChatMessageResponse(BaseModel):
    message_id: str
    session_id: str
    role: str
    content: str
    sources: list[SourceCitation]
    usage: UsageInfo
    created_at: str


class MessageItem(BaseModel):
    id: str
    role: str
    content: str
    sources: list[SourceCitation] = []
    created_at: str


class SessionMessagesResponse(BaseModel):
    session_id: str
    messages: list[MessageItem]


# ── Health ───────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    version: str


# ── Error ────────────────────────────────────────────────────────────────────

class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorDetail
