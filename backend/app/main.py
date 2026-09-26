"""Punto de entrada de la API de Rutopia.

Construye la aplicacion FastAPI, aplica la configuracion de CORS y monta el
enrutador raiz bajo el prefijo `/api`.

Ejecutar en desarrollo:
    uv run fastapi dev app/main.py

La documentacion interactiva queda en http://localhost:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    summary="Generacion automatica de itinerarios turisticos",
    description=(
        "API del proyecto de Bases de Datos II e Ingenieria de Software "
        "del equipo HAVING Fe (curso 2026-2027)."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/", tags=["diagnostico"])
def root() -> dict[str, str]:
    """Presenta la API y apunta a su documentacion.

    Returns:
        Un diccionario con el nombre del servicio y la ruta de la documentacion.
    """
    return {"servicio": settings.app_name, "documentacion": "/docs"}
