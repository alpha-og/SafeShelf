from sqlmodel import Field, SQLModel, Relationship

class Store(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    uuid: str = Field(index=True, unique=True)
    name: str
    address: str | None = None
    city: str | None = None
    lat: float | None = None
    lon: float | None = None
    hours: str | None = None

    inventory: list["StoreInventory"] = Relationship(back_populates="store")


class StoreInventory(SQLModel, table=True):
    store_id: int = Field(foreign_key="store.id", primary_key=True)
    product_id: int = Field(foreign_key="product.id", primary_key=True)
    stock_quantity: int = 0
    price: float = 0.0
    in_stock: bool = False

    store: Store | None = Relationship(back_populates="inventory")
    product: "Product" = Relationship(back_populates="inventory")
