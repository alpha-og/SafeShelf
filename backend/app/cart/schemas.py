from pydantic import BaseModel


class CartItem(BaseModel):
    id: str
    barcode: str
    product_name: str | None = None
    quantity: int = 1


class CartResponse(BaseModel):
    items: list[CartItem]


class AddItemRequest(BaseModel):
    barcode: str
    quantity: int = 1


class AddItemResponse(BaseModel):
    id: str
    barcode: str
    product_name: str | None = None
    quantity: int
