from pydantic import BaseModel


class SuggestRequest(BaseModel):
    cart_items: list[str] = []
    ingredients: list[str] = []
    query: str | None = None


class SuggestResponse(BaseModel):
    recipes: list[dict]
    substitutions: list[dict] = []
