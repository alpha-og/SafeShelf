from sqlmodel import Field, SQLModel, Relationship

class Product(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    uuid: str = Field(index=True, unique=True)
    barcode: str = Field(index=True, unique=True)
    product_name: str
    product_image: str | None = None
    brand: str | None = None
    quantity: str | None = None

    inventory: list["StoreInventory"] = Relationship(back_populates="product")
