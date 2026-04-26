from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # LLM
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Embeddings
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # Environment — "local" uses TinyDB + ChromaDB, "prod" uses MongoDB + pgvector
    ENV: str = "local"

    # Telemetry — False locally (just console logs), True in prod (Railway)
    ANONYMIZED_TELEMETRY: bool = False

    # Storage — local
    ARTICLES_DB_PATH: str = "app/data/articles.json"
    CHROMA_PERSIST_DIR: str = "app/data/chroma"
    CHROMA_COLLECTION_NAME: str = "insurance_articles"

    # Storage — prod (Railway)
    MONGODB_URI: str = ""          # e.g. mongodb+srv://...
    DATABASE_URL: str = ""         # e.g. postgresql://user:pass@host/db
    PGVECTOR_TABLE: str = "chunks"

    # Server
    PORT: int = 8000
    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: str = "http://localhost:3000"

    # API key protection — disabled locally, enabled in prod
    API_KEY_ENABLED: bool = False
    API_KEY: str = ""

    # Guardrails — set False to bypass in dev/tests
    GUARDRAILS_ENABLED: bool = True

    # RAG pipeline
    RAG_TOP_K: int = 5
    RAG_CHUNK_SIZE: int = 500
    RAG_CHUNK_OVERLAP: int = 50

    # LLM behaviour
    LLM_MAX_RETRIES: int = 3
    LLM_TEMPERATURE: float = 0.2
    LLM_RETRY_AFTER_SECONDS: int = 10

    # Session
    SESSION_TTL_SECONDS: int = 7200  # 2 hours

    # Search
    SEARCH_DEFAULT_LIMIT: int = 10
    SEARCH_MAX_LIMIT: int = 50
    SEARCH_QUERY_MAX_LEN: int = 200
    SEARCH_SNIPPET_MAX_LEN: int = 200
    SEARCH_KEYWORD_BOOST: float = 0.15

    # Chat
    CHAT_MESSAGE_MAX_LEN: int = 2000

    # Articles
    ARTICLE_DEFAULT_LIMIT: int = 20
    ARTICLE_MAX_LIMIT: int = 100
    ARTICLE_RELATED_LIMIT: int = 3

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
