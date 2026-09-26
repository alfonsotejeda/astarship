"""Entorno de ejecucion de Alembic.

Conecta las migraciones con la configuracion de la aplicacion:

- La URL de conexion sale de `app.core.config` (que la lee de `DATABASE_URL`),
  no de `alembic.ini`, para no duplicarla ni versionar credenciales.
- El `target_metadata` es el de `app.db.base.Base`, que es lo que permite a
  `alembic revision --autogenerate` comparar los modelos con la base de datos.

IMPORTANTE: para que `--autogenerate` vea una tabla, su modelo tiene que estar
importado aqui abajo. Si anades un modelo nuevo y la migracion sale vacia,
es casi seguro que se te olvido importarlo.
"""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import get_settings
from app.db.base import Base

# Al importar los modelos se registran en Base.metadata.
# A medida que se cierren las entidades del MERX se van anadiendo aqui:
# from app.models import actividad, itinerario, paquete  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Inyecta la URL de la aplicacion en la configuracion de Alembic.
config.set_main_option("sqlalchemy.url", get_settings().database_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Genera el SQL de las migraciones sin conectarse a la base de datos.

    Util para revisar que va a ejecutarse o para pasarle el script a alguien:
        uv run alembic upgrade head --sql
    """
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Aplica las migraciones conectandose a la base de datos."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # Detecta tambien los cambios de tipo de una columna, no solo
            # las columnas y tablas que aparecen o desaparecen.
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
