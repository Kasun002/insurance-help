"""
embeddings.py
-------------
Thin singleton wrapper over SentenceTransformer.
Loaded once at startup; shared across VectorRepo and RAGService.
"""

from sentence_transformers import SentenceTransformer


class EmbeddingClient:
    def __init__(self, model_name: str) -> None:
        self._model = SentenceTransformer(model_name)

    def embed(self, text: str) -> list[float]:
        """Embed a single string. Returns a 384-dim float list."""
        return self._model.encode(text, show_progress_bar=False).tolist()

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed multiple strings in one forward pass."""
        return self._model.encode(texts, show_progress_bar=False).tolist()

    @property
    def dimension(self) -> int:
        return self._model.get_sentence_embedding_dimension()  # type: ignore[return-value]
