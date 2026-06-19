from pydantic import BaseModel


class CategoryResponse(BaseModel):
    id: str
    name: str
    off_tag: str | None = None

class ProductResponse(BaseModel):
    id: str
    barcode: str
    product_name: str
    product_image: str | None = None
    brand: str | None = None
    quantity: str | None = None
    categories: list[CategoryResponse] = []

class BarcodeResponse(BaseModel):
    barcode: str
    product_name: str | None = None
    brand: str | None = None
    categories: list[str] = []
    ingredients: list[str] = []
    nutrients: dict = {}
    allergens: list[str] = []
    image_url: str | None = None
    nutriscore_grade: str | None = None
    ecoscore_grade: str | None = None
    nova_group: int | None = None
    nutrient_levels: dict = {}
    labels: list[str] = []
    allergen_traces: list[str] = []
    image_nutrition_url: str | None = None
    image_ingredients_url: str | None = None
    quantity: str | None = None
    serving_size: str | None = None


class SearchResponse(BaseModel):
    results: list[BarcodeResponse]
    total: int


class IdentifyRequest(BaseModel):
    image: str | None = None
    barcode: str | None = None
    text: str | None = None


class IdentifyResponse(BaseModel):
    barcode: str | None = None
    product: BarcodeResponse | None = None
    confidence: float = 0.0
