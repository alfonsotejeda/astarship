"""Enrutador raiz de la API.

Cada modulo funcional (actividades, itinerarios, paquetes, ...) registra aqui su
propio `APIRouter`. Manteniendo un unico punto de montaje, `main.py` no necesita
cambiar cada vez que aparece un endpoint nuevo.
"""

from fastapi import APIRouter

from app.api.routes import health

api_router = APIRouter()
api_router.include_router(health.router)

# A medida que avance el proyecto:
# api_router.include_router(actividades.router, prefix="/actividades")
# api_router.include_router(itinerarios.router, prefix="/itinerarios")
# api_router.include_router(paquetes.router, prefix="/paquetes")
