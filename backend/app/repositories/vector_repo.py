"""
vector_repo.py
--------------
Local (ChromaDB) implementation of BaseVectorRepo.
Used when ENV=local (default). For production use PgVectorRepo.
"""

from dataclasses import dataclass

import chromadb
from sentence_transformers import SentenceTransformer

from app.models.domain import Chunk
from app.repositories.base import BaseVectorRepo


@dataclass
class VectorRepoConfig:
    chroma_dir: str
    collection_name: str
    embedding_model: str


class VectorRepo(BaseVectorRepo):
    def __init__(self, config: VectorRepoConfig) -> None:
        self._client = chromadb.PersistentClient(path=config.chroma_dir)
        self._collection = self._client.get_or_create_collection(
            name=config.collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        self._model = SentenceTransformer(config.embedding_model)

    # ── Public API ────────────────────────────────────────────────────────────

    def similarity_search(
        self,
        query: str,
        top_k: int = 5,
        where: dict | None = None,
    ) -> list[Chunk]:
        """
        Embed query and retrieve top_k most similar chunks from Chroma.

        Args:
            query:  Natural-language question from the user.
            top_k:  Number of chunks to return.
            where:  Optional Chroma metadata filter, e.g. {"article_id": "art_claims_travel_001"}.

        Returns:
            List of Chunk domain objects sorted by descending relevance (score 0–1).
        """
        if self._collection.count() == 0:
            return []

        embedding = self._model.encode(query).tolist()

        kwargs: dict = {
            "query_embeddings": [embedding],
            "n_results": min(top_k, self._collection.count()),
            "include": ["documents", "metadatas", "distances"],
        }
        if where:
            kwargs["where"] = where

        result = self._collection.query(**kwargs)

        chunks: list[Chunk] = []
        ids = result.get("ids", [[]])[0]
        documents = result.get("documents", [[]])[0]
        metadatas = result.get("metadatas", [[]])[0]
        distances = result.get("distances", [[]])[0]

        for cid, doc, meta, dist in zip(ids, documents, metadatas, distances):
            # Chroma cosine distance → similarity score (higher = more similar)
            score = 1.0 - float(dist)
            chunks.append(
                Chunk(
                    id=cid,
                    document=doc,
                    score=round(score, 4),
                    metadata=meta or {},
                )
            )

        return chunks

    def get_collection_stats(self) -> dict:
        """Return basic stats about the Chroma collection."""
        count = self._collection.count()
        return {
            "collection_name": self._collection.name,
            "chunk_count": count,
            "embedding_model": self._model.get_sentence_embedding_dimension(),
        }
