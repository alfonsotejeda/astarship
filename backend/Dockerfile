# API image, built with uv.
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /srv

# Install dependencies before copying the code to keep Docker's cache.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY app ./app
COPY alembic.ini ./
COPY migrations ./migrations

ENV PATH="/srv/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]
