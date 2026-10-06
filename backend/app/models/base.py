"""Modelos de SQLAlchemy del dominio.

El esquema de datos esta definido en `docs/merx/astarship-logical-schema.md`.
Cada entidad se anade como un modulo propio en este paquete, heredando de
`app.db.base.Base` para quedar registrada en `Base.metadata`.
"""
