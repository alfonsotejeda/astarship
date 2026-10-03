"""Clase base declarativa de la que heredan todos los modelos ORM.

Los modelos concretos viven en `app/models/` y se van anadiendo segun se cierre
el MERX. Alembic importa este modulo para descubrir el metadata completo.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base declarativa comun a todas las tablas del esquema de Astarship."""
