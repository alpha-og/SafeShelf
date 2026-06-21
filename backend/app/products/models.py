from sqlmodel import Field, SQLModel, Relationship


class ProductCategory(SQLModel, table=True):
    product_id: int = Field(foreign_key='product.id', primary_key=True)
    category_id: int = Field(foreign_key='category.id', primary_key=True)


class Category(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    uuid: str = Field(index=True, unique=True)
    name: str
    off_tag: str | None = None

    products: list['Product'] = Relationship(
        back_populates='categories', link_model=ProductCategory
    )


class Product(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    uuid: str = Field(index=True, unique=True)
    barcode: str = Field(index=True, unique=True)
    product_name: str
    product_image: str | None = None
    brand: str | None = None
    quantity: str | None = None

    inventory: list['StoreInventory'] = Relationship(back_populates='product')
    categories: list[Category] = Relationship(back_populates='products', link_model=ProductCategory)
