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
