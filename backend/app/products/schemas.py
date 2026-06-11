from pydantic import BaseModel


class BarcodeResponse(BaseModel):
    barcode: str
    product_name: str | None = None
    brand: str | None = None
    categories: list[str] = []
    ingredients: list[str] = []
    nutrients: dict = {}
    allergens: list[str] = []
    image_url: str | None = None


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
