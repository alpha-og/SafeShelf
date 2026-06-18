from pydantic import BaseModel


class StoreItem(BaseModel):
    id: str
    name: str
    address: str
    city: str | None = None
    lat: float
    lon: float


class NearbyResponse(BaseModel):
    stores: list[StoreItem]


class StoreResponse(BaseModel):
    id: str
    name: str
    address: str
    city: str | None = None
    lat: float
    lon: float
    hours: str | None = None


class StoreProductsResponse(BaseModel):
    store_id: str
    products: list[dict]


class InventoryResponse(BaseModel):
    store_id: str
    barcode: str
    product_name: str | None = None
    product_image: str | None = None
    in_stock: bool
    quantity: int = 0
    price: float = 0.0
