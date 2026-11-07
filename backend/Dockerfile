# API image, built with uv.
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /srv

# Install dependencies before copying the code to keep Docker's cache.
# The uv cache mount keeps downloaded packages between builds.
ENV UV_LINK_MODE=copy \
    UV_HTTP_TIMEOUT=120
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

COPY app ./app
COPY alembic.ini ./
COPY migrations ./migrations

ENV PATH="/srv/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]
