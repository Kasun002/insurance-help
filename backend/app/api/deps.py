"""
Dependency injection providers.
Repos are singletons stored in app.state during lifespan startup.
"""

from fastapi import Depends, Request

from app.config import Settings, get_settings
from app.repositories.base import BaseArticleRepo, BaseVectorRepo
from app.services.search_service import SearchService
from app.services.rag_service import RAGService
from app.services.chat_service import ChatService
from app.core.guardrails import InputGuardrail, OutputGuardrail


def get_config(settings: Settings = Depends(get_settings)) -> Settings:
    return settings


def get_article_repo(request: Request) -> BaseArticleRepo:
    return request.app.state.article_repo


def get_vector_repo(request: Request) -> BaseVectorRepo:
    return request.app.state.vector_repo


def get_search_service(request: Request) -> SearchService:
    return request.app.state.search_service


def get_rag_service(request: Request) -> RAGService:
    return request.app.state.rag_service


def get_chat_service(request: Request) -> ChatService:
    return request.app.state.chat_service


def get_input_guardrail(request: Request) -> InputGuardrail:
    return request.app.state.input_guardrail


def get_output_guardrail(request: Request) -> OutputGuardrail:
    return request.app.state.output_guardrail
