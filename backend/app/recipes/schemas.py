from pydantic import BaseModel


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


class SearchResponse(BaseModel):
    success: bool
    recipes: list[dict] = []
    total: int = 0
    page: int = 1
    page_size: int = 10
    error: str | None = None
    rejected: bool = False
    rejection_reason: str | None = None
