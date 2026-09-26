"""Rutas de diagnostico.

Sirven para comprobar que la API responde y que la conexion con PostgreSQL
esta viva, sin depender de ninguna tabla del esquema.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db

router = APIRouter(tags=["diagnostico"])


@router.get("/health")
def health() -> dict[str, str]:
    """Comprueba que la API esta levantada.

    Returns:
        Un diccionario con el estado del servicio.
    """
    return {"status": "ok"}


@router.get("/health/db")
def health_db(db: Session = Depends(get_db)) -> dict[str, str]:
    """Comprueba que la base de datos responde.

    Args:
        db: Sesion de base de datos inyectada por FastAPI.

    Returns:
        Un diccionario con el estado de la conexion y la version de PostgreSQL.
    """
    version = db.execute(text("SELECT version()")).scalar_one()
    return {"status": "ok", "postgres": version}
