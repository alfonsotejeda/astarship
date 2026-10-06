"""Astarship API entry point."""

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
    """Expose the service name and a pointer to the docs."""
    return {"servicio": settings.app_name, "documentacion": "/docs"}
