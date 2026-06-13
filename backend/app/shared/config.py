from pathlib import Path

from pydantic_settings import BaseSettings

ROOT_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://user:password@host:5432/dbname"
    SECRET_KEY: str = "change-me-to-a-random-secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    COOKIE_SECURE: bool = True
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    HOST: str = "localhost"
    PORT: int = 8926
    DEBUG: bool = True
    DB_ECHO: bool = False
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    WHO_CLIENT_ID: str = ""
    WHO_CLIENT_SECRET: str = ""

    model_config = {
        "env_file": [
            ROOT_DIR / ".env",
            ".env",
            ".env.local",
        ],
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
