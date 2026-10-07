"""Application configuration.

All secrets and environment-specific values are read from environment
variables (or a local .env file) so nothing sensitive is committed.
"""
from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- App ---
    PROJECT_NAME: str = "TaskFlow API"
    API_V1_PREFIX: str = "/api"
    ENVIRONMENT: str = "development"

    # --- Security ---
    # Generate a strong value with:  python -c "import secrets; print(secrets.token_urlsafe(48))"
    SECRET_KEY: str = "dev-only-change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    ALGORITHM: str = "HS256"

    # --- Database ---
    # Default is a local SQLite file so the project runs with ZERO cost and no
    # external services. In production set DATABASE_URL to a free Postgres
    # (Azure Database for PostgreSQL free tier, Neon, or Supabase).
    DATABASE_URL: str = "sqlite+aiosqlite:///./taskflow.db"

    # --- CORS ---
    # Comma-separated list of allowed origins (the Vercel URL goes here).
    BACKEND_CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,https://taskflow.vercel.app"

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.BACKEND_CORS_ORIGINS.split(",") if o.strip()]

    @field_validator("DATABASE_URL")
    @classmethod
    def normalize_db_url(cls, v: str) -> str:
        # Accept plain postgres URLs and upgrade them to the async driver.
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql+asyncpg://", 1)
        elif v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
