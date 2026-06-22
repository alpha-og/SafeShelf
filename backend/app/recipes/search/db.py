import logging
import re

from httpx import AsyncClient
from sqlalchemy import String, cast, func, or_
from sqlalchemy.engine import make_url
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.recipes.models import Recipe
from app.recipes.schemas import RecipeItem, RecipeQuery
from app.shared.config import settings

logger = logging.getLogger(__name__)

# ── Database-backed recipe search (primary source) ──────────────────────

_URL = make_url(settings.DATABASE_URL)
_IS_SQLITE = _URL.drivername.startswith('sqlite')

_TOKEN_RE = re.compile(r'[a-z]+')


def _match_ingredient(recipe_ingredient: str, search_term: str) -> bool:
    tokens = _TOKEN_RE.findall(recipe_ingredient.lower())
    st = search_term.lower().strip()
    if not st or not tokens:
        return False
    for token in tokens:
        if token == st:
            return True
        if len(st) > 2 and (token == st + 's' or token == st + 'es'):
            return True
        if len(token) > 2 and (st == token + 's' or st == token + 'es'):
            return True
        if token.endswith('ies') and st == token[:-3] + 'y':
            return True
        if st.endswith('ies') and token == st[:-3] + 'y':
            return True
    return False


def _recipe_has_all_ingredients(recipe_item: RecipeItem, needed: list[str]) -> bool:
    return all(
        any(_match_ingredient(rn, need) for rn in recipe_item.ingredients) for need in needed
    )


def _recipe_has_any_excluded(recipe_item: RecipeItem, excluded: list[str]) -> bool:
    return any(
        any(_match_ingredient(rn, excl) for rn in recipe_item.ingredients) for excl in excluded
    )


def recipe_to_item(recipe: Recipe) -> RecipeItem:
    return RecipeItem(
        id=str(recipe.id),
        name=recipe.name,
        category=recipe.category,
        area=recipe.cuisine,
        ingredients=list(recipe.ingredients) if recipe.ingredients else [],
        measurements=list(recipe.measurements) if recipe.measurements else [],
        instructions=recipe.instructions or '',
        thumbnail_url=recipe.image_url,
        tags=list(recipe.tags) if recipe.tags else [],
        youtube_url=recipe.youtube_url,
        source_url=recipe.source_url,
        author_name=recipe.author_name,
        source=recipe.source,
        servings=recipe.servings,
        is_ai_generated=recipe.is_ai_generated,
    )


def _build_ingredient_filter(ingredients: list[str]):
    """Build a broad SQL pre-filter that narrows results for ingredient search.

    Uses text-level ILIKE on the serialized JSON array so it works on both
    PostgreSQL and SQLite.  The filter is intentionally broad — accurate
    matching happens later in Python via _recipe_has_all_ingredients.
    """
    if not ingredients:
        return None
    filters = [cast(Recipe.ingredients, String).ilike(f'%{ing}%') for ing in ingredients]
    return or_(*filters)


async def _db_search_recipes_internal(
    session: AsyncSession,
    category: str | None = None,
    ingredients: list[str] | None = None,
    area: str | None = None,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[RecipeItem], int]:
    conditions = []

    if category:
        conditions.append(Recipe.category == category)

    if area:
        conditions.append(Recipe.cuisine == area)

    if ingredients:
        ing_filter = _build_ingredient_filter(ingredients)
        if ing_filter is not None:
            conditions.append(ing_filter)

    count_stmt = select(func.count(Recipe.id))
    if conditions:
        count_stmt = count_stmt.where(*conditions)
    total = (await session.exec(count_stmt)).one() or 0

    stmt = select(Recipe)
    if conditions:
        stmt = stmt.where(*conditions)
    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size)
    rows = (await session.exec(stmt)).all()

    items = [recipe_to_item(r) for r in rows]

    if ingredients:
        items = [r for r in items if _recipe_has_all_ingredients(r, ingredients)]

    return items, total


async def db_lookup_recipe_by_id(session: AsyncSession, recipe_id: int) -> RecipeItem | None:
    stmt = select(Recipe).where(Recipe.id == recipe_id)
    recipe = (await session.exec(stmt)).first()
    return recipe_to_item(recipe) if recipe else None


async def db_lookup_recipe_by_source_id(
    session: AsyncSession, source: str, source_id: str
) -> RecipeItem | None:
    stmt = select(Recipe).where(Recipe.source == source, Recipe.source_id == source_id)
    recipe = (await session.exec(stmt)).first()
    return recipe_to_item(recipe) if recipe else None


async def db_fetch_random(
    session: AsyncSession,
    limit: int = 50,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[RecipeItem], int]:
    count_stmt = select(func.count(Recipe.id))
    total_in_db = (await session.exec(count_stmt)).one() or 0
    pool_size = min(limit, total_in_db)

    if pool_size == 0:
        return [], 0

    id_stmt = select(Recipe.id).order_by(func.random()).limit(pool_size)
    random_ids = (await session.exec(id_stmt)).all()
    pool_size = len(random_ids)

    offset = (page - 1) * page_size
    if offset >= pool_size:
        return [], pool_size

    page_ids = random_ids[offset : offset + page_size]
    stmt = select(Recipe).where(Recipe.id.in_(page_ids))
    rows = (await session.exec(stmt)).all()

    return [recipe_to_item(r) for r in rows], pool_size

# ── Database-backed search (primary source, MealDB fallback disabled) ─────

_DB_SEARCH_LIMIT = 500


async def _db_execute_search(session: AsyncSession, q: RecipeQuery) -> list[RecipeItem]:
    """Query the Recipe table with the given criteria, post-filter in Python."""
    if not q.categories and not q.areas and not q.ingredients and not q.search_text:
        return []

    conditions: list = []

    if q.categories:
        conditions.append(Recipe.category.in_(q.categories))

    if q.areas:
        conditions.append(Recipe.cuisine.in_(q.areas))

    if q.ingredients:
        ing_filter = _build_ingredient_filter(q.ingredients)
        if ing_filter is not None:
            conditions.append(ing_filter)

    if q.search_text:
        # Use OR across all meaningful words so "chicken biriyani" still finds biryani recipes
        words = list({w for w in re.findall(r'[a-z]+', q.search_text.lower()) if len(w) > 2})
        if words:
            word_conditions = [Recipe.name.ilike(f'%{w}%') for w in words]
            conditions.append(or_(*word_conditions))

    stmt = select(Recipe)
    if conditions:
        stmt = stmt.where(*conditions)
    stmt = stmt.limit(_DB_SEARCH_LIMIT)
    rows = (await session.exec(stmt)).all()

    items = [recipe_to_item(r) for r in rows]

    if q.search_text:
        # Sort by relevance: how many words from the query are in the recipe name
        words = [w for w in re.findall(r'[a-z]+', q.search_text.lower()) if len(w) > 2]
        def relevance(item: RecipeItem) -> int:
            name_lower = item.name.lower()
            return sum(1 for w in words if w in name_lower)
        items.sort(key=relevance, reverse=True)

    if q.ingredients:
        items = [r for r in items if _has_all_ingredients(r, q.ingredients)]

    if q.exclude_ingredients:
        items = [r for r in items if not _has_any_excluded(r, q.exclude_ingredients)]

    return items


async def db_run_search(session: AsyncSession, q: RecipeQuery) -> list[RecipeItem]:
    # Tier 1: Food.com DB with full constraints
    results = await _db_execute_search(session, q)
    if results:
        return results

    # Tier 2: Relax ingredients, still try DB
    if q.ingredients:
        relaxed = q.model_copy(update={'ingredients': []})
        results = await _db_execute_search(session, relaxed)
        if results:
            return results

    # Tier 3: Relax areas too, still try DB
    if q.areas:
        relaxed = q.model_copy(update={'areas': [], 'ingredients': []})
        results = await _db_execute_search(session, relaxed)
        if results:
            return results

    # Tier 4: Fallback to MealDB
    from app.recipes.search.mealdb import run_search

    async with AsyncClient() as client:
        return await run_search(client, q)


def _has_all_ingredients(recipe: RecipeItem, needed: list[str]) -> bool:
    recipe_names = recipe.ingredients
    return all(any(_match_ingredient(rn, need) for rn in recipe_names) for need in needed)


def _has_any_excluded(recipe: RecipeItem, excluded: list[str]) -> bool:
    recipe_names = recipe.ingredients
    return any(any(_match_ingredient(rn, excl) for rn in recipe_names) for excl in excluded)
