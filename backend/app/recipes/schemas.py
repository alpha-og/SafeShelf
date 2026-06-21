from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class SuggestRequest(BaseModel):
    cart_items: list[str] = []
    ingredients: list[str] = []
    query: str | None = None


class SuggestResponse(BaseModel):
    recipes: list[dict]
    substitutions: list[dict] = []


class SearchRequest(BaseModel):
    query: str = ''
    categories: list[str] = []
    areas: list[str] = []
    page: int = 1
    page_size: int = 10


class ClarificationField(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    label: str
    description: str | None = None
    schema_: dict = Field(default={}, validation_alias='schema', serialization_alias='schema')


class SearchResponse(BaseModel):
    success: bool
    status: Literal['results', 'clarification_needed', 'rejected'] = 'results'
    recipes: list[dict] = []
    total: int = 0
    page: int = 1
    page_size: int = 10
    error: str | None = None
    rejected: bool = False
    rejection_reason: str | None = None
    session_id: str | None = None
    clarifications: list[ClarificationField] | None = None


class ClarifyRequest(BaseModel):
    session_id: str
    answers: dict[str, object]


class ClarifyResponse(BaseModel):
    success: bool
    status: Literal['results', 'clarification_needed', 'rejected']
    recipes: list[dict] = []
    total: int = 0
    session_id: str | None = None
    clarifications: list[ClarificationField] | None = None
    error: str | None = None
    rejection_reason: str | None = None


class FeedRequest(BaseModel):
    page: int = 1
    page_size: int = 10


class ProductVariant(BaseModel):
    barcode: str
    product_name: str
    product_image: str | None = None
    brand: str | None = None
    quantity: str | None = None
    price: float
    in_stock: bool


class IngredientMapping(BaseModel):
    ingredient: str
    options: list[ProductVariant] = []


class RecipeProductsResponse(BaseModel):
    recipe_id: str
    recipe_name: str
    mappings: list[IngredientMapping]


class AdjustedIngredient(BaseModel):
    ingredient: str
    original_measurement: str
    adjusted_measurement: str
    note: str | None = None


class RecipeQuantitiesRequest(BaseModel):
    ingredients: list[str]
    measurements: list[str]
    original_servings: int | None = None
    desired_servings: int = 4
    dietary_preferences: list[str] = []
    conditions: list[str] = []
    allergens: list[str] = []
    recipe_name: str | None = None


class RecipeQuantitiesResponse(BaseModel):
    recipe_id: str
    recipe_name: str
    desired_servings: int
    ingredients: list[AdjustedIngredient]
