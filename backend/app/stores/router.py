from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from app.stores.schemas import (
    InventoryResponse,
    NearbyResponse,
    StoreProductsResponse,
    StoreResponse,
)
from app.stores.service import get_stores, get_store, get_store_inventory, get_store_products
from app.stores.models import StoreInventory
from app.shared.deps import get_session

router = APIRouter(prefix='/stores', tags=['stores'])


@router.get('', response_model=NearbyResponse)
async def list_stores(
    city: str | None = None,
    lat: float | None = None,
    lon: float | None = None,
    session: AsyncSession = Depends(get_session),
):
    return await get_stores(city, lat, lon, session)


@router.get('/{store_id}', response_model=StoreResponse)
async def store_detail(store_id: str, session: AsyncSession = Depends(get_session)):
    return await get_store(store_id, session)


@router.get('/{store_id}/products', response_model=StoreProductsResponse)
async def store_products(store_id: str, session: AsyncSession = Depends(get_session)):
    return await get_store_products(store_id, session)


@router.get('/{store_id}/inventory/search', response_model=list[InventoryResponse])
async def search_inventory(store_id: str, q: str, session: AsyncSession = Depends(get_session)):
    from app.stores.service import search_store_inventory

    return await search_store_inventory(store_id, q, session)


@router.get('/{store_id}/inventory', response_model=list[InventoryResponse])
async def all_inventory(store_id: str, session: AsyncSession = Depends(get_session)):
    from app.stores.service import get_all_store_inventory

    return await get_all_store_inventory(store_id, session)


@router.get('/{store_id}/inventory/{product_id}', response_model=InventoryResponse)
async def inventory(store_id: str, product_id: str, session: AsyncSession = Depends(get_session)):
    return await get_store_inventory(store_id, product_id, session)
