"""Application settings read from the environment."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "AstarShip API"
    environment: str = "development"
    debug: bool = True
    database_url: str = "postgresql+psycopg://astarship:astarship@localhost:5432/astarship"
    cors_origins: list[str] = ["http://localhost:5173", "https://alfonsotejeda.github.io"]


@lru_cache
def get_settings() -> Settings:
    """Return the cached application settings."""
    return Settings()
