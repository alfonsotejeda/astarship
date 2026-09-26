"""Motor y sesiones de SQLAlchemy.

Expone `get_db`, la dependencia que usan las rutas de FastAPI para obtener una
sesion por peticion y cerrarla al terminar.
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

_settings = get_settings()

engine = create_engine(
    _settings.database_url,
    echo=_settings.debug,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    """Entrega una sesion de base de datos para una peticion.

    Yields:
        La sesion activa, que se cierra automaticamente al finalizar la peticion
        aunque la ruta lance una excepcion.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
