from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://user:password@host:5432/dbname"
    SECRET_KEY: str = "change-me-to-a-random-secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    COOKIE_SECURE: bool = True
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8826"
    HOST: str = "localhost"
    PORT: int = 8926
    DEBUG: bool = True
    DB_ECHO: bool = False

    model_config = {"env_file": [".env", ".env.local"], "env_file_encoding": "utf-8"}


settings = Settings()
