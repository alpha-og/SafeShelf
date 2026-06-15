from fastapi import HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from app.stores.models import StoreInventory


async def get_nearby_stores(lat: float | None, lon: float | None) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented")


async def get_store(store_id: str) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented")


async def get_store_products(store_id: str) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented")


async def get_store_inventory(store_id: str, product_id: str, session: AsyncSession) -> dict:
    stmt = select(StoreInventory).where(StoreInventory.product_id == product_id)
    result = await session.execute(stmt)
    inv = result.scalar_one_or_none()
    
    if not inv:
        return {
            "store_id": store_id,
            "product_id": product_id,
            "product_name": None,
            "product_image": None,
            "in_stock": False,
            "quantity": 0,
            "price": 0.0
        }
        
    return {
        "store_id": store_id,
        "product_id": product_id,
        "product_name": inv.product_name,
        "product_image": inv.product_image,
        "in_stock": inv.in_stock,
        "quantity": inv.stock_quantity,
        "price": inv.price
    }

async def get_all_store_inventory(store_id: str, session: AsyncSession) -> list[dict]:
    stmt = select(StoreInventory)
    result = await session.execute(stmt)
    invs = result.scalars().all()
    
    return [
        {
            "store_id": store_id,
            "product_id": inv.product_id,
            "product_name": inv.product_name,
            "product_image": inv.product_image,
            "in_stock": inv.in_stock,
            "quantity": inv.stock_quantity,
            "price": inv.price
        }
        for inv in invs
    ]
