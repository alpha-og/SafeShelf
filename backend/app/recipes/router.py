from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from app.recipes.schemas import (
    ClarifyRequest,
    ClarifyResponse,
    RecipeItem,
    RecipeProductsResponse,
    RecipeQuantitiesRequest,
    RecipeQuantitiesResponse,
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
    get_recipe_quantities_handler,
    search_recipes_handler,
    suggest_recipes,
    embed_all_recipes_task,
)
from app.shared.deps import get_current_user, get_session

router = APIRouter(prefix='/recipes', tags=['recipes'])

@router.post("/embed-all")
async def embed_all(session: AsyncSession = Depends(get_session)):
    """
    Generate and save vector embeddings for all recipes currently in the database.
    """
    from fastapi import HTTPException, status
    try:
        count = await embed_all_recipes_task(session)
        return {
            "success": True,
            "message": (
                f"Successfully loaded and embedded {count} "
                "recipes in the suggestions index."
            )
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to index recipes: {str(e)}"
        )


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


@router.post('/{id}/quantities', response_model=RecipeQuantitiesResponse)
async def get_recipe_quantities(
    id: str,
    req: RecipeQuantitiesRequest,
    session: AsyncSession = Depends(get_session),
    _current_user=Depends(get_current_user),
):
    return await get_recipe_quantities_handler(id, req, session)
