# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — install production Python dependencies
# Uses --prefix so packages land in /install, copied cleanly in stage 3.
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS deps

WORKDIR /build
COPY requirements-prod.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements-prod.txt


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — pre-bake the embedding model into the image
# Downloads sentence-transformers/all-MiniLM-L6-v2 from HuggingFace at BUILD
# time so the container never hits the internet at runtime.
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS model

COPY --from=deps /install /usr/local
ENV SENTENCE_TRANSFORMERS_HOME=/model_cache

RUN python -c "\
from sentence_transformers import SentenceTransformer; \
SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"


# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 — minimal runtime image
# Only prod packages + pre-baked model + application code.
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Copy installed packages from deps stage
COPY --from=deps /install /usr/local

# Copy pre-baked embedding model from model stage
COPY --from=model /model_cache /app/.model_cache
ENV SENTENCE_TRANSFORMERS_HOME=/app/.model_cache

# Copy application code only (tests/, scripts/, chroma/ excluded by .dockerignore)
COPY app/ app/

EXPOSE 8000

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
