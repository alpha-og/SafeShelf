import random

from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app.recipes.agent import (
    RecipeQuery,
    adjust_quantities,
    db_run_search,
    extract_query,
    validate_query,
)
from app.recipes.product_matching import match_ingredients
from app.recipes.schemas import (
    ClarifyRequest,
    ClarifyResponse,
    RecipeProductsResponse,
    RecipeQuantitiesRequest,
    RecipeQuantitiesResponse,
    SearchRequest,
    SearchResponse,
    SuggestRequest,
)
from app.recipes.tools import (
    RecipeItem,
    db_fetch_random,
    db_lookup_recipe_by_id,
    lookup_recipe_by_id,
)
from app.shared.timing import log_duration

from .session import advance_round, create_session

CATEGORIES = [
    'Beef',
    'Chicken',
    'Dessert',
    'Lamb',
    'Miscellaneous',
    'Pasta',
    'Pork',
    'Seafood',
    'Side',
    'Starter',
    'Vegan',
    'Vegetarian',
    'Breakfast',
    'Goat',
]

AREAS = [
    'American',
    'British',
    'Canadian',
    'Chinese',
    'French',
    'Greek',
    'Indian',
    'Irish',
    'Italian',
    'Japanese',
    'Mexican',
    'Moroccan',
    'Polish',
    'Spanish',
    'Thai',
    'Vietnamese',
]


async def get_recipe_handler(id: str, session: AsyncSession) -> RecipeItem:
    from fastapi import HTTPException, status

    async with log_duration('recipe.lookup'):
        try:
            recipe = await db_lookup_recipe_by_id(session, int(id))
        except ValueError:
            recipe = None
    if recipe is not None:
        return recipe

    async with log_duration('recipe.lookup_mealdb'):
        async with AsyncClient() as client:
            recipe = await lookup_recipe_by_id(client, id)
    if recipe is not None:
        return recipe

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Recipe not found')


async def get_recipe_products_handler(
    id: str,
    store_id: str,
    session: AsyncSession,
) -> RecipeProductsResponse:

    async with log_duration('recipe.fetch'):
        recipe = await get_recipe_handler(id, session)
    if not recipe.ingredients:
        return RecipeProductsResponse(
            recipe_id=recipe.id,
            recipe_name=recipe.name,
            mappings=[],
        )

    async with log_duration('db.match_ingredients'):
        mappings = await match_ingredients(session, recipe.ingredients, store_id)

    return RecipeProductsResponse(
        recipe_id=recipe.id,
        recipe_name=recipe.name,
        mappings=mappings,
    )


async def suggest_recipes(req: SuggestRequest, session) -> dict:
    from fastapi import HTTPException, status

    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail='Not implemented')


async def search_recipes_handler(req: SearchRequest, session: AsyncSession) -> SearchResponse:
    if not req.query and not req.categories and not req.areas:
        return SearchResponse(
            success=True,
            recipes=[],
            total=0,
            page=req.page,
            page_size=req.page_size,
        )

    if req.query and req.query.strip():
        async with log_duration('llm.extract_query'):
            extracted = await extract_query(req.query)
        if not extracted.is_recipe_query:
            return SearchResponse(
                success=False,
                error='Query is not related to recipes or food.',
                page=req.page,
                page_size=req.page_size,
            )

        if extracted.needs_clarification and extracted.clarifications:
            clar_session = create_session(req.query, req.categories, req.areas)
            return SearchResponse(
                success=True,
                status='clarification_needed',
                session_id=clar_session.session_id,
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

    async with log_duration('db.search_recipes'):
        all_recipes = await db_run_search(session, extracted)

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


async def clarify_handler(req: ClarifyRequest, session: AsyncSession) -> ClarifyResponse:
    clar_session = advance_round(req.session_id, req.answers)
    if clar_session is None:
        return ClarifyResponse(
            success=False,
            status='rejected',
            error='Session expired or not found. Please start a new search.',
        )

    if clar_session.round > 3:
        return ClarifyResponse(
            success=False,
            status='rejected',
            error='Too many clarification rounds. Please start a new search.',
        )

    answer_parts = [f'{k}: {v}' for k, v in clar_session.collected_answers.items()]
    enriched_query = clar_session.query
    if answer_parts:
        enriched_query = f'{clar_session.query}\n\nAdditional context: {". ".join(answer_parts)}.'

    async with log_duration('llm.extract_query.clarify'):
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
            session_id=clar_session.session_id,
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

    if not extracted.categories and not extracted.areas and not extracted.ingredients:
        if clar_session.collected_answers:
            return ClarifyResponse(
                success=True,
                status='clarification_needed',
                session_id=clar_session.session_id,
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

    if clar_session.raw_categories:
        extracted.categories = list(set(extracted.categories + clar_session.raw_categories))
    if clar_session.raw_areas:
        extracted.areas = list(set(extracted.areas + clar_session.raw_areas))

    validation = validate_query(enriched_query, extracted)
    if not validation.is_valid:
        return ClarifyResponse(
            success=False,
            status='rejected',
            rejection_reason=validation.reason,
        )

    async with log_duration('db.search_recipes.clarify'):
        all_recipes = await db_run_search(session, extracted)

    return ClarifyResponse(
        success=True,
        status='results',
        recipes=[r.model_dump() for r in all_recipes],
        total=len(all_recipes),
        session_id=clar_session.session_id,
    )


async def feed_handler(
    page: int = 1,
    page_size: int = 10,
    session: AsyncSession | None = None,
) -> SearchResponse:
    if session is None:
        return SearchResponse(
            success=False,
            recipes=[],
            total=0,
            page=page,
            page_size=page_size,
            error='Database session required',
        )

    async with log_duration('db.feed_random'):
        items, total = await db_fetch_random(session, limit=100, page=page, page_size=page_size)

    random.shuffle(items)

    return SearchResponse(
        success=True,
        recipes=[r.model_dump() for r in items],
        total=total,
        page=page,
        page_size=page_size,
    )


async def get_recipe_quantities_handler(
    id: str,
    req: RecipeQuantitiesRequest,
    session: AsyncSession,
) -> RecipeQuantitiesResponse:
    recipe = await get_recipe_handler(id, session)

    adjustment = await adjust_quantities(
        ingredients=req.ingredients or recipe.ingredients,
        measurements=req.measurements or recipe.measurements,
        original_servings=req.original_servings or recipe.servings,
        desired_servings=req.desired_servings,
        dietary_preferences=req.dietary_preferences,
        conditions=req.conditions,
        allergens=req.allergens,
        recipe_name=req.recipe_name or recipe.name,
    )

    return RecipeQuantitiesResponse(
        recipe_id=recipe.id,
        recipe_name=recipe.name,
        desired_servings=req.desired_servings,
        ingredients=adjustment.ingredients,
    )
