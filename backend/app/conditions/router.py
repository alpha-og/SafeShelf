from fastapi import APIRouter

from app.conditions.service import search_conditions

router = APIRouter(prefix='/conditions', tags=['conditions'])


@router.get('/search')
async def search(q: str):
    return await search_conditions(q)
