"""Declarative base de SQLAlchemy.

Todos los modelos de `app.models` heredan de `Base` para registrarse en
`Base.metadata`, que es lo que lee Alembic al generar migraciones (ver
`migrations/env.py`).

La `naming_convention` fija nombres predecibles para indices, FKs y demas
constraints (en vez de los autogenerados por cada backend), necesario para
que `alembic revision --autogenerate` pueda referenciarlos sin ambiguedad en
operaciones de alter/drop posteriores.
"""

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Clase base declarativa compartida por todos los modelos."""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)
