from datetime import datetime

from sqlalchemy import JSON, Index, UniqueConstraint
from sqlmodel import Field, SQLModel


class Recipe(SQLModel, table=True):
    __table_args__ = (
        UniqueConstraint('source', 'source_id', name='uq_recipe_source'),
        Index('idx_recipe_name', 'name'),
        Index('idx_recipe_category', 'category'),
        Index('idx_recipe_cuisine', 'cuisine'),
        Index('idx_recipe_source', 'source'),
        Index('idx_recipe_source_id', 'source_id'),
    )

    id: int | None = Field(default=None, primary_key=True)
    source: str  # 'foodcom', 'mealdb', or 'ai'
    source_id: str
    is_ai_generated: bool = Field(default=False)

    name: str
    category: str | None = None
    cuisine: str | None = None
    ingredients: list[str] = Field(default=[], sa_type=JSON)
    measurements: list[str] | None = Field(default=None, sa_type=JSON)
    instructions: str = ''
    image_url: str | None = None
    tags: list[str] = Field(default=[], sa_type=JSON)
    source_url: str | None = None
    youtube_url: str | None = None

    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None
    total_time_minutes: int | None = None
    aggregate_rating: float | None = None
    review_count: int | None = None
    servings: int | None = None
    description: str | None = None
    author_name: str | None = None

    calories: float | None = None
    fat_content: float | None = None
    saturated_fat_content: float | None = None
    cholesterol_content: float | None = None
    sodium_content: float | None = None
    carbohydrate_content: float | None = None
    fiber_content: float | None = None
    sugar_content: float | None = None
    protein_content: float | None = None

    date_published: datetime | None = None
    created_at: datetime | None = None
