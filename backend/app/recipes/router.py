from fastapi import APIRouter, Depends

from app.recipes.schemas import SearchRequest, SearchResponse, SuggestRequest, SuggestResponse
from app.recipes.service import get_recipe_handler, search_recipes_handler, suggest_recipes
from app.recipes.tools import RecipeItem
from app.shared.deps import get_current_user, get_session

router = APIRouter(prefix='/recipes', tags=['recipes'])


@router.get('/{id}', response_model=RecipeItem)
async def get_recipe(
    id: str,
    _current_user=Depends(get_current_user),
):
    return await get_recipe_handler(id)


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
    _current_user=Depends(get_current_user),
):
    return await search_recipes_handler(req)
