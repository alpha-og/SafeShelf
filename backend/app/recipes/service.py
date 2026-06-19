import asyncio
import random

from httpx import AsyncClient

from app.recipes.agent import RecipeQuery, extract_query, run_search, validate_query
from app.recipes.product_matching import match_ingredients
from app.recipes.schemas import (
    ClarifyRequest,
    ClarifyResponse,
    RecipeProductsResponse,
    SearchRequest,
    SearchResponse,
    SuggestRequest,
)
from app.recipes.tools import RecipeItem, _search_recipes_internal, lookup_recipe_by_id

from .session import advance_round, create_session

CATEGORIES = [
    'Beef', 'Chicken', 'Dessert', 'Lamb', 'Miscellaneous', 'Pasta', 'Pork',
    'Seafood', 'Side', 'Starter', 'Vegan', 'Vegetarian', 'Breakfast', 'Goat',
]

AREAS = [
    'American', 'British', 'Canadian', 'Chinese', 'French', 'Greek', 'Indian',
    'Irish', 'Italian', 'Japanese', 'Mexican', 'Moroccan', 'Polish', 'Spanish',
    'Thai', 'Vietnamese',
]


async def get_recipe_handler(id: str) -> RecipeItem:
    from fastapi import HTTPException, status

    async with AsyncClient() as client:
        recipe = await lookup_recipe_by_id(client, id)
    if recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Recipe not found')
    return recipe


async def get_recipe_products_handler(
    id: str, store_id: str, session,
) -> RecipeProductsResponse:

    recipe = await get_recipe_handler(id)
    if not recipe.ingredients:
        return RecipeProductsResponse(
            recipe_id=recipe.id,
            recipe_name=recipe.name,
            mappings=[],
        )

    mappings = await match_ingredients(session, recipe.ingredients, store_id)

    return RecipeProductsResponse(
        recipe_id=recipe.id,
        recipe_name=recipe.name,
        mappings=mappings,
    )


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

        if extracted.needs_clarification and extracted.clarifications:
            session = create_session(req.query, req.categories, req.areas)
            return SearchResponse(
                success=True,
                status='clarification_needed',
                session_id=session.session_id,
                clarifications=[
                    {
                        'id': c.id,
                        'label': c.label,
                        'description': c.description,
                        'schema': c.schema_,
                    }
                    for c in extracted.clarifications
                ],
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


async def clarify_handler(req: ClarifyRequest) -> ClarifyResponse:
    session = advance_round(req.session_id, req.answers)
    if session is None:
        return ClarifyResponse(
            success=False,
            status='rejected',
            error='Session expired or not found. Please start a new search.',
        )

    if session.round > 3:
        return ClarifyResponse(
            success=False,
            status='rejected',
            error='Too many clarification rounds. Please start a new search.',
        )

    # Enrich the query with answers as natural context
    answer_parts = [f'{k}: {v}' for k, v in session.collected_answers.items()]
    enriched_query = session.query
    if answer_parts:
        enriched_query = f'{session.query}\n\nAdditional context: {". ".join(answer_parts)}.'

    extracted = await extract_query(
        enriched_query,
        system_extra=(
            'This is a follow-up extraction. The user already answered previous '
            'clarification questions — their answers are appended as additional '
            'context. Use all available information. If the query is still '
            'ambiguous about what they want to eat, it is fine to ask more '
            'clarifying questions. Do NOT re-ask already answered topics.'
        ),
    )

    if not extracted.is_recipe_query:
        return ClarifyResponse(
            success=False,
            status='rejected',
            error='Query is not related to recipes or food.',
        )

    if extracted.needs_clarification and extracted.clarifications:
        return ClarifyResponse(
            success=True,
            status='clarification_needed',
            session_id=session.session_id,
            clarifications=[
                {
                    'id': c.id,
                    'label': c.label,
                    'description': c.description,
                    'schema': c.schema_,
                }
                for c in extracted.clarifications
            ],
        )

    # Post-extraction guard: if the LLM produced no searchable fields despite
    # having answers, fall back to direct category/area selection rather than
    # silently returning empty results
    if not extracted.categories and not extracted.areas and not extracted.ingredients:
        if session.collected_answers:
            return ClarifyResponse(
                success=True,
                status='clarification_needed',
                session_id=session.session_id,
                clarifications=[
                    {
                        'id': 'category',
                        'label': 'What type of dish are you looking for?',
                        'schema': {'type': 'string', 'enum': CATEGORIES},
                    },
                    {
                        'id': 'area',
                        'label': 'Any cuisine preference?',
                        'schema': {'type': 'string', 'enum': ['No preference'] + AREAS},
                    },
                ],
            )

    if session.raw_categories:
        extracted.categories = list(set(extracted.categories + session.raw_categories))
    if session.raw_areas:
        extracted.areas = list(set(extracted.areas + session.raw_areas))

    validation = validate_query(enriched_query, extracted)
    if not validation.is_valid:
        return ClarifyResponse(
            success=False,
            status='rejected',
            rejection_reason=validation.reason,
        )

    async with AsyncClient() as client:
        all_recipes = await run_search(client, extracted)

    return ClarifyResponse(
        success=True,
        status='results',
        recipes=[r.model_dump() for r in all_recipes],
        total=len(all_recipes),
        session_id=session.session_id,
    )


async def feed_handler(page: int = 1, page_size: int = 10) -> SearchResponse:
    popular_categories = random.sample(CATEGORIES, min(3, len(CATEGORIES)))
    random_categories = random.sample(
        [c for c in CATEGORIES if c not in popular_categories],
        min(2, len(CATEGORIES) - 3),
    )
    all_cats = popular_categories + random_categories

    async with AsyncClient() as client:
        tasks = []
        for cat in all_cats:
            tasks.append(_search_recipes_internal(client, cat, None, None))
        results = await asyncio.gather(*tasks)

    seen: set[str] = set()
    deduped: list[RecipeItem] = []
    for batch in results:
        for r in batch:
            if r.id not in seen:
                seen.add(r.id)
                deduped.append(r)

    random.shuffle(deduped)

    total = len(deduped)
    start = (page - 1) * page_size
    sliced = deduped[start : start + page_size]

    return SearchResponse(
        success=True,
        recipes=[r.model_dump() for r in sliced],
        total=total,
        page=page,
        page_size=page_size,
    )
