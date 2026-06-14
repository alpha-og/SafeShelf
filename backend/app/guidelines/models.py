from datetime import datetime

from sqlmodel import Field, JSON, SQLModel

from app.shared.utils import utcnow


class ConditionThreshold(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    disease: str = Field(index=True)
    code: str = Field(default="UNKNOWN", index=True)
    entries: list[dict] = Field(default_factory=list, sa_type=JSON)
    version: str = Field(default="1.0")
    created_at: datetime = Field(default_factory=utcnow)


class IngredientAlias(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    alias: str = Field(unique=True, index=True)
    trigger: str
