from datetime import datetime

from sqlmodel import Field, JSON, SQLModel

from app.shared.utils import utcnow


class ConditionThreshold(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    disease: str = Field(index=True)
    rules: list[dict] = Field(default_factory=list, sa_type=JSON)
    recommendations: list[str] = Field(default_factory=list, sa_type=JSON)
    exclusions: list[str] = Field(default_factory=list, sa_type=JSON)
    interaction_rules: list[dict] = Field(default_factory=list, sa_type=JSON)
    source: str | None = None
    version: str = Field(default="1.0")
    created_at: datetime = Field(default_factory=utcnow)


class IngredientAlias(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    alias: str = Field(unique=True, index=True)
    trigger: str
