import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api.v1.router import router as v1_router
from app.core.exceptions import AppError, app_error_handler, unhandled_error_handler
from app.repositories.article_repo import ArticleRepo
from app.repositories.vector_repo import VectorRepo, VectorRepoConfig
from app.repositories.base import BaseArticleRepo, BaseVectorRepo
from app.services.search_service import SearchService
from app.core.llm_client import GeminiClient
from app.services.rag_service import RAGService
from app.repositories.session_repo import SessionRepo
from app.services.chat_service import ChatService
from app.core.guardrails import InputGuardrail, OutputGuardrail


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    app.state.settings = settings

    # Propagate telemetry setting to os.environ BEFORE any DB client initialises.
    # ChromaDB (and other libs) read ANONYMIZED_TELEMETRY directly from the environment.
    # Local: False  → no external telemetry, console logs only.
    # Prod:  True   → Railway can capture and forward telemetry.
    os.environ["ANONYMIZED_TELEMETRY"] = str(settings.ANONYMIZED_TELEMETRY).lower()

    # ── Repo factory: local (TinyDB + ChromaDB) vs prod (MongoDB + pgvector) ──
    article_repo: BaseArticleRepo
    vector_repo: BaseVectorRepo

    if settings.ENV == "prod":
        if not settings.MONGODB_URI:
            raise RuntimeError("ENV=prod requires MONGODB_URI to be set")
        if not settings.DATABASE_URL:
            raise RuntimeError("ENV=prod requires DATABASE_URL to be set")

        # Lazy imports — pymongo and psycopg2 only needed in prod
        from app.repositories.mongo_article_repo import MongoArticleRepo
        from app.repositories.pg_vector_repo import PgVectorRepo

        article_repo = MongoArticleRepo(
            mongodb_uri=settings.MONGODB_URI,
            articles_json_path=settings.ARTICLES_DB_PATH,
        )
        vector_repo = PgVectorRepo(
            database_url=settings.DATABASE_URL,
            embedding_model=settings.EMBEDDING_MODEL,
            table_name=settings.PGVECTOR_TABLE,
        )
    else:
        # Default: local — TinyDB JSON file + ChromaDB on disk
        article_repo = ArticleRepo(db_path=settings.ARTICLES_DB_PATH)
        vector_repo = VectorRepo(
            VectorRepoConfig(
                chroma_dir=settings.CHROMA_PERSIST_DIR,
                collection_name=settings.CHROMA_COLLECTION_NAME,
                embedding_model=settings.EMBEDDING_MODEL,
            )
        )

    app.state.article_repo = article_repo
    app.state.vector_repo = vector_repo

    # SearchService — stateless, depends on both repos
    app.state.search_service = SearchService(
        vector_repo=app.state.vector_repo,
        article_repo=app.state.article_repo,
    )

    # GeminiClient + RAGService (no-op if API key is absent — fails at request time)
    app.state.llm_client = GeminiClient(
        api_key=settings.GEMINI_API_KEY,
        model_name=settings.GEMINI_MODEL,
    )
    app.state.rag_service = RAGService(
        vector_repo=app.state.vector_repo,
        llm_client=app.state.llm_client,
        article_repo=app.state.article_repo,
    )

    # Guardrails — stateless singletons, shared across requests
    app.state.input_guardrail = InputGuardrail()
    app.state.output_guardrail = OutputGuardrail()

    # SessionRepo + ChatService (in-memory, 2h TTL)
    app.state.session_repo = SessionRepo()
    app.state.chat_service = ChatService(
        session_repo=app.state.session_repo,
        rag_service=app.state.rag_service,
        article_repo=app.state.article_repo,
        input_guardrail=app.state.input_guardrail,
        output_guardrail=app.state.output_guardrail,
        guardrails_enabled=settings.GUARDRAILS_ENABLED,
    )

    yield
    # Shutdown — nothing to clean up


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="AI Insurance Help Center",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(v1_router, prefix="/api/v1")

    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)

    return app


app = create_app()
