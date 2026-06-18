from httpx import AsyncClient

from app.recipes.agent import RecipeQuery, extract_query, run_search, validate_query
from app.recipes.schemas import SearchRequest, SearchResponse, SuggestRequest
from app.recipes.tools import _search_recipes_internal


async def suggest_recipes(req: SuggestRequest, session) -> dict:
    from fastapi import HTTPException, status

    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail='Not implemented')


async def search_recipes_handler(req: SearchRequest) -> SearchResponse:
    if not req.query and not req.categories and not req.areas:
        return SearchResponse(
            success=True,
            recipes=[],
            total=0,
            page=req.page,
            page_size=req.page_size,
        )

    if req.query and req.query.strip():
        extracted = await extract_query(req.query)
        if not extracted.is_recipe_query:
            return SearchResponse(
                success=False,
                error='Query is not related to recipes or food.',
                page=req.page,
                page_size=req.page_size,
            )
        if req.categories:
            extracted.categories = list(set(extracted.categories + req.categories))
        if req.areas:
            extracted.areas = list(set(extracted.areas + req.areas))
    else:
        extracted = RecipeQuery(
            is_recipe_query=True,
            categories=req.categories,
            areas=req.areas,
        )

    validation = validate_query(req.query or '', extracted)
    if not validation.is_valid:
        return SearchResponse(
            success=False,
            recipes=[],
            total=0,
            page=req.page,
            page_size=req.page_size,
            rejected=True,
            rejection_reason=validation.reason,
        )

    async with AsyncClient() as client:
        all_recipes = await run_search(client, extracted)

    total = len(all_recipes)
    start = (req.page - 1) * req.page_size
    sliced = all_recipes[start : start + req.page_size]

    return SearchResponse(
        success=True,
        recipes=[r.model_dump() for r in sliced],
        total=total,
        page=req.page,
        page_size=req.page_size,
    )
