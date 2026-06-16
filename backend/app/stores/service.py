from fastapi import HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from app.stores.models import StoreInventory


import math

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 #radius of earth in kms
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

async def get_stores(city: str | None, lat: float | None, lon: float | None, session: AsyncSession) -> dict:
    from app.stores.models import Store
    stmt = select(Store)
    if city:
        stmt = stmt.where(Store.city == city)
    
    result = await session.execute(stmt)
    stores = result.scalars().all()
    
    store_list = [
        {
            "id": s.uuid,
            "name": s.name,
            "address": s.address or "",
            "city": s.city,
            "lat": s.lat or 0.0,
            "lon": s.lon or 0.0
        } for s in stores
    ]
    
    if lat is not None and lon is not None:
        store_list.sort(key=lambda s: calculate_distance(lat, lon, s["lat"], s["lon"]) if s["lat"] and s["lon"] else float('inf'))
        
    return {"stores": store_list}


async def get_store(store_id: str, session: AsyncSession) -> dict:
    from app.stores.models import Store
    stmt = select(Store).where(Store.uuid == store_id)
    result = await session.execute(stmt)
    s = result.scalar_one_or_none()
    
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")
        
    return {
        "id": s.uuid,
        "name": s.name,
        "address": s.address or "",
        "city": s.city,
        "lat": s.lat or 0.0,
        "lon": s.lon or 0.0,
        "hours": s.hours
    }


async def get_store_products(store_id: str, session: AsyncSession) -> dict:
    from app.stores.models import Store, StoreInventory
    from app.products.models import Product
    
    stmt = select(Product).join(StoreInventory).join(Store).where(Store.uuid == store_id)
    result = await session.execute(stmt)
    products = result.scalars().all()
    
    product_list = [
        {
            "id": str(prod.uuid),
            "barcode": prod.barcode,
            "product_name": prod.product_name,
            "product_image": prod.product_image,
            "brand": prod.brand,
            "quantity": prod.quantity,
            "categories": []
        }
        for prod in products
    ]
    
    return {
        "store_id": store_id,
        "products": product_list
    }

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
    from app.stores.models import Store, StoreInventory
    from app.products.models import Product
    
    #to ensure we get data from that store itself
    stmt = (
        select(StoreInventory, Product)
        .join(Store, StoreInventory.store_id == Store.id)
        .join(Product, StoreInventory.product_id == Product.id)
        .where(Store.uuid == store_id)
    )
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

async def search_store_inventory(store_id: str, q: str, session: AsyncSession) -> list[dict]:
    from app.stores.models import Store, StoreInventory
    from app.products.models import Product
    
    stmt = (
        select(StoreInventory, Product)
        .join(Store, StoreInventory.store_id == Store.id)
        .join(Product, StoreInventory.product_id == Product.id)
        .where(Store.uuid == store_id)
        .where(Product.product_name.ilike(f"%{q}%"))
    )
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
