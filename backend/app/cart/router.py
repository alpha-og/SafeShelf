from fastapi import APIRouter, Depends

from app.cart.schemas import AddItemRequest, AddItemResponse, CartResponse
from app.cart.service import add_cart_item, get_cart, remove_cart_item
from app.shared.deps import get_current_user, get_session

router = APIRouter(prefix='/cart', tags=['cart'])


@router.get('', response_model=CartResponse)
async def cart(
    session=Depends(get_session),
    _current_user=Depends(get_current_user),
):
    return await get_cart(session)


@router.post('/items', response_model=AddItemResponse, status_code=201)
async def add_item(
    req: AddItemRequest,
    session=Depends(get_session),
    _current_user=Depends(get_current_user),
):
    return await add_cart_item(req, session)


@router.delete('/items/{item_id}', status_code=204)
async def remove_item(
    item_id: str,
    session=Depends(get_session),
    _current_user=Depends(get_current_user),
):
    await remove_cart_item(item_id, session)
