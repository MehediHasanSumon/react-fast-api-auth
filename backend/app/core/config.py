import os
import json
from urllib.parse import quote_plus
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Access & User Management API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS Origins (accepts JSON string or list of origins)
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # JWT Authentication & Cookie Security Settings
    SECRET_KEY: str = "app-super-secret-key-production-change-2026-sumon"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 1 hour
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30    # 30 days
    
    # HttpOnly Cookie Settings
    COOKIE_NAME_ACCESS: str = "access_token"
    COOKIE_NAME_REFRESH: str = "refresh_token"
    COOKIE_NAME_USER_DISPLAY: str = "app_user_display"
    COOKIE_SECURE: bool = False  # Set to True when served over HTTPS in production
    COOKIE_SAMESITE: str = "lax"
    COOKIE_DOMAIN: Union[str, None] = None
    COOKIE_PATH: str = "/"

    # SMTP Email Configuration
    SMTP_HOST: Union[str, None] = None
    SMTP_PORT: int = 587
    SMTP_USER: Union[str, None] = None
    SMTP_PASSWORD: Union[str, None] = None
    SMTP_FROM_EMAIL: Union[str, None] = None
    SMTP_FROM_NAME: str = "Access Portal"
    SMTP_TLS: bool = True
    SMTP_SSL: bool = False

    # Frontend URL & Static Uploads
    FRONTEND_URL: str = "http://localhost:5173"
    UPLOAD_DIR: str = "uploads"

    @property
    def uploads_path(self) -> str:
        base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        return os.path.join(base, self.UPLOAD_DIR)

    # Database Settings (PostgreSQL)
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "hospital_db"
    DATABASE_URL: Union[str, None] = None

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Union[str, None], info) -> str:
        if isinstance(v, str) and v.strip():
            return v
        data = info.data
        user = data.get("POSTGRES_USER", "postgres")
        password = data.get("POSTGRES_PASSWORD", "postgres")
        server = data.get("POSTGRES_SERVER", "localhost")
        port = data.get("POSTGRES_PORT", 5432)
        db = data.get("POSTGRES_DB", "hospital_db")
        encoded_user = quote_plus(str(user))
        encoded_password = quote_plus(str(password))
        return f"postgresql+psycopg://{encoded_user}:{encoded_password}@{server}:{port}/{db}"

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, str) and v.startswith("["):
            return json.loads(v)
        elif isinstance(v, list):
            return v
        return []

    model_config = SettingsConfigDict(
        env_file=(
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"),
            ".env",
        ),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
