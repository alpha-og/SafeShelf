from fastapi import APIRouter

from app.stores.schemas import InventoryResponse, NearbyResponse, StoreProductsResponse, StoreResponse
from app.stores.service import get_nearby_stores, get_store, get_store_inventory, get_store_products

router = APIRouter(prefix="/stores", tags=["stores"])


@router.get("/nearby", response_model=NearbyResponse)
async def nearby(lat: float | None = None, lon: float | None = None):
    return await get_nearby_stores(lat, lon)


@router.get("/{store_id}", response_model=StoreResponse)
async def store_detail(store_id: str):
    return await get_store(store_id)


@router.get("/{store_id}/products", response_model=StoreProductsResponse)
async def store_products(store_id: str):
    return await get_store_products(store_id)


@router.get("/{store_id}/inventory/{product_id}", response_model=InventoryResponse)
async def inventory(store_id: str, product_id: str):
    return await get_store_inventory(store_id, product_id)
