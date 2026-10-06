"""Esquemas Pydantic de entrada y salida de la API.

El esquema de datos esta definido en `docs/merx/astarship-logical-schema.md`.
Cada entidad anade sus propios esquemas en un modulo de este paquete; los de
lectura (salida de la API, construidos desde el modelo de SQLAlchemy) heredan
de `ORMSchema` para no repetir `from_attributes=True` en cada uno.
"""

from pydantic import BaseModel, ConfigDict


class ORMSchema(BaseModel):
    """Base para esquemas de salida construidos desde un modelo de SQLAlchemy."""

    model_config = ConfigDict(from_attributes=True)
