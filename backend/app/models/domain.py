"""
Internal domain models — not exposed directly via API.
These are the canonical representations used inside services and repositories.
"""

from dataclasses import dataclass, field


@dataclass
class Subcategory:
    id: str
    name: str
    article_count: int = 0


@dataclass
class Category:
    id: str
    name: str
    icon: str
    description: str
    subcategories: list[Subcategory] = field(default_factory=list)
    article_count: int = 0


@dataclass
class Attachment:
    type: str
    label: str
    url: str
    size_kb: int | None = None


@dataclass
class Step:
    order: int
    title: str
    body: str


@dataclass
class ChecklistItem:
    scenario: str
    documents: list[str]


@dataclass
class Contact:
    phone: str | None = None
    postal_address: str | None = None


@dataclass
class Article:
    id: str
    slug: str
    title: str
    category_id: str
    subcategory_id: str
    summary: str
    content_markdown: str
    steps: list[Step] = field(default_factory=list)
    document_checklists: list[ChecklistItem] = field(default_factory=list)
    attachments: list[Attachment] = field(default_factory=list)
    contact: Contact | None = None
    source_url: str = ""
    read_time_min: int = 3
    updated_at: str = ""
    tags: list[str] = field(default_factory=list)
    related_article_ids: list[str] = field(default_factory=list)


@dataclass
class Chunk:
    id: str
    document: str
    score: float
    metadata: dict


@dataclass
class Message:
    id: str
    role: str  # "user" | "assistant"
    content: str
    created_at: str
    sources: list[dict] = field(default_factory=list)


@dataclass
class Session:
    session_id: str
    created_at: str
    seed_article_id: str | None = None
    messages: list[Message] = field(default_factory=list)
    last_active: str = ""
