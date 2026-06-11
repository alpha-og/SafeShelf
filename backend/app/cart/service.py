from fastapi import HTTPException, status

from app.cart.schemas import AddItemRequest


async def get_cart(session) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented")


async def add_cart_item(req: AddItemRequest, session) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented")


async def remove_cart_item(item_id: str, session) -> None:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented")
