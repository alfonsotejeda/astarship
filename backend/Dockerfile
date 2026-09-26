# Imagen de la API. Usa uv, que es el gestor con el que trabaja el equipo.
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /srv

# Las dependencias se instalan antes de copiar el codigo para aprovechar
# la cache de Docker: si solo cambia el codigo, no se reinstala nada.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY app ./app

ENV PATH="/srv/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
