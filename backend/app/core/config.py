"""Configuracion de la aplicacion, leida del entorno.

Todos los valores tienen un valor por defecto pensado para desarrollo local con
el `docker compose` del repositorio, de forma que `uv run fastapi dev` funcione
sin crear un `.env` a mano.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Ajustes de la aplicacion.

    Attributes:
        app_name: Nombre que se muestra en la documentacion de la API.
        environment: Entorno de ejecucion (`development`, `test`, `production`).
        debug: Activa trazas detalladas y recarga automatica.
        database_url: Cadena de conexion a PostgreSQL en formato SQLAlchemy.
        cors_origins: Origenes autorizados a consumir la API desde el navegador.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Astarship API"
    environment: str = "development"
    debug: bool = True
    database_url: str = "postgresql+psycopg://astarship:astarship@localhost:5432/astarship"
    cors_origins: list[str] = ["http://localhost:5173"]


@lru_cache
def get_settings() -> Settings:
    """Devuelve los ajustes de la aplicacion.

    El resultado se cachea para que el fichero `.env` se lea una sola vez por
    proceso y para poder sustituir la dependencia con facilidad en los tests.

    Returns:
        La instancia unica de `Settings`.
    """
    return Settings()
