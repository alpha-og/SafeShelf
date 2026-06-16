from fastapi import HTTPException, status


async def get_nearby_stores(lat: float | None, lon: float | None) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail='Not implemented')


async def get_store(store_id: str) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail='Not implemented')


async def get_store_products(store_id: str) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail='Not implemented')


async def get_store_inventory(store_id: str, product_id: str) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail='Not implemented')
