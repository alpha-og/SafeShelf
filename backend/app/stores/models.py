from sqlmodel import Field, SQLModel, Relationship, UniqueConstraint
from pydantic import model_validator

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
    __table_args__ = (UniqueConstraint("store_id", "product_id", name="uq_store_product"),)

    store_id: int = Field(foreign_key="store.id", primary_key=True)
    product_id: int = Field(foreign_key="product.id", primary_key=True)
    stock_quantity: int = 0
    price: float = 0.0
    in_stock: bool = False

    store: Store | None = Relationship(back_populates="inventory")
    product: "Product" = Relationship(back_populates="inventory")

    @model_validator(mode="after")
    def auto_calc_in_stock(self) -> "StoreInventory":
        if self.stock_quantity is not None:
            self.in_stock = self.stock_quantity > 0
        return self
