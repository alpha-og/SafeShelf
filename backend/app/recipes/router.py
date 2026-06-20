from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from app.recipes.schemas import (
    ClarifyRequest,
    ClarifyResponse,
    RecipeProductsResponse,
    SearchRequest,
    SearchResponse,
    SuggestRequest,
    SuggestResponse,
)
from app.recipes.service import (
    clarify_handler,
    feed_handler,
    get_recipe_handler,
    get_recipe_products_handler,
    search_recipes_handler,
    suggest_recipes,
)
from app.recipes.tools import RecipeItem
from app.shared.deps import get_current_user, get_session

router = APIRouter(prefix='/recipes', tags=['recipes'])


@router.get('/feed', response_model=SearchResponse)
async def feed(
    page: int = 1,
    page_size: int = 10,
    session: AsyncSession = Depends(get_session),
    _current_user=Depends(get_current_user),
):
    return await feed_handler(page, page_size, session)


@router.get('/{id}', response_model=RecipeItem)
async def get_recipe(
    id: str,
    session: AsyncSession = Depends(get_session),
    _current_user=Depends(get_current_user),
):
    return await get_recipe_handler(id, session)


@router.get('/{id}/products', response_model=RecipeProductsResponse)
async def get_recipe_products(
    id: str,
    store_id: str,
    session: AsyncSession = Depends(get_session),
    _current_user=Depends(get_current_user),
):
    return await get_recipe_products_handler(id, store_id, session)


@router.post('/suggest', response_model=SuggestResponse)
async def suggest(
    req: SuggestRequest,
    session=Depends(get_session),
    _current_user=Depends(get_current_user),
):
    return await suggest_recipes(req, session)


@router.post('/search', response_model=SearchResponse)
async def search(
    req: SearchRequest,
    session: AsyncSession = Depends(get_session),
    _current_user=Depends(get_current_user),
):
    return await search_recipes_handler(req, session)


@router.post('/clarify', response_model=ClarifyResponse)
async def clarify(
    req: ClarifyRequest,
    session: AsyncSession = Depends(get_session),
    _current_user=Depends(get_current_user),
):
    return await clarify_handler(req, session)
