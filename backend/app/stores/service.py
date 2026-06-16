from fastapi import HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from app.stores.models import StoreInventory


async def get_nearby_stores(lat: float | None, lon: float | None) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail='Not implemented')


async def get_store(store_id: str) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail='Not implemented')


async def get_store_products(store_id: str) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented")

async def get_store_inventory(store_id: str, product_id: str, session: AsyncSession) -> dict:
    from app.stores.models import Store
    from app.products.models import Product
    stmt = select(StoreInventory, Product).join(Store).join(Product).where(
        Store.uuid == store_id, 
        Product.barcode == product_id
    )
    result = await session.execute(stmt)
    row = result.first()
    
    if not row:
        return {
            "store_id": store_id,
            "barcode": product_id,
            "product_name": None,
            "product_image": None,
            "in_stock": False,
            "quantity": 0,
            "price": 0.0
        }
        
    inv, prod = row
        
    return {
        "store_id": store_id,
        "barcode": prod.barcode,
        "product_name": prod.product_name,
        "product_image": prod.product_image,
        "in_stock": inv.in_stock,
        "quantity": inv.stock_quantity,
        "price": inv.price
    }

async def get_all_store_inventory(store_id: str, session: AsyncSession) -> list[dict]:
    from app.stores.models import Store
    from app.products.models import Product
    stmt = select(StoreInventory, Product).join(Store).join(Product).where(Store.uuid == store_id)
    result = await session.execute(stmt)
    rows = result.all()
    
    return [
        {
            "store_id": store_id,
            "barcode": prod.barcode,
            "product_name": prod.product_name,
            "product_image": prod.product_image,
            "in_stock": inv.in_stock,
            "quantity": inv.stock_quantity,
            "price": inv.price
        }
        for inv, prod in rows
    ]
