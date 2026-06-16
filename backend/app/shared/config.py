from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings

ROOT_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    DATABASE_URL: str = 'postgresql+asyncpg://user:password@host:5432/dbname'
    SECRET_KEY: str = 'change-me-to-a-random-secret'
    ALGORITHM: str = 'HS256'
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    COOKIE_SECURE: bool = True
    CORS_ORIGINS: str = 'http://localhost:3000,http://localhost:8826'
    HOST: str = Field(default='localhost', validation_alias=AliasChoices('BACKEND_HOST', 'HOST'))
    PORT: int = Field(default=8926, validation_alias=AliasChoices('BACKEND_PORT', 'PORT'))
    DEBUG: bool = True
    DB_ECHO: bool = False
    GROQ_API_KEY: str = ''
    GROQ_MODEL: str = 'llama-3.3-70b-versatile'
    WHO_CLIENT_ID: str = ''
    WHO_CLIENT_SECRET: str = ''

    REQUIRED_ENV_VARS: list[str] = [
        'WHO_CLIENT_ID',
        'WHO_CLIENT_SECRET',
        'GROQ_API_KEY',
    ]

    model_config = {
        'env_file': [
            ROOT_DIR / '.env',  # root shared config
            '.env',  # backend-specific
            '.env.local',  # local overrides (gitignored)
        ],
        'env_file_encoding': 'utf-8',
        'extra': 'ignore',
    }

    def get_missing_required(self) -> list[str]:
        return [key for key in self.REQUIRED_ENV_VARS if not getattr(self, key, '')]


settings = Settings()
