from sqlmodel import Field, SQLModel

class StoreInventory(SQLModel, table=True):
    product_id: str = Field(primary_key=True)
    product_name: str | None = None
    product_image: str | None = None
    stock_quantity: int = 0
    price: float = 0.0
    in_stock: bool = False
