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
    GEMINI_MODEL: str = "gemini-2.0-flash-exp"

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

    # Guardrails — set False to bypass in dev/tests
    GUARDRAILS_ENABLED: bool = True

    # RAG
    RAG_TOP_K: int = 5
    RAG_CHUNK_SIZE: int = 500
    RAG_CHUNK_OVERLAP: int = 50

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
