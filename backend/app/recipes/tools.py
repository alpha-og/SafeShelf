import asyncio
import logging
import re

from httpx import AsyncClient, HTTPError
from langchain_core.tools import tool
from pydantic import BaseModel
from sqlalchemy import String, cast, func, or_
from sqlalchemy.engine import make_url
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

import app.shared._patch_platform  # noqa: F401 — system SSL cert store for httpx
from app.recipes.models import Recipe
from app.shared.config import settings
from app.shared.timing import log_duration

logger = logging.getLogger(__name__)

THEMEALDB_BASE = 'https://www.themealdb.com/api/json/v1/1/'


class RecipeItem(BaseModel):
    id: str
    name: str
    category: str | None = None
    area: str | None = None
    ingredients: list[str]
    measurements: list[str]
    instructions: str
    thumbnail_url: str | None = None
    tags: list[str] = []
    youtube_url: str | None = None
    source_url: str | None = None
    author_name: str | None = None
    source: str | None = None


async def _meal_ids_by_ingredient(client: AsyncClient, ingredient: str) -> set[str]:
    try:
        resp = await client.get(
            f'{THEMEALDB_BASE}filter.php',
            params={'i': ingredient},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        meals = data.get('meals')
        if not meals:
            return set()
        return {m['idMeal'] for m in meals}
    except (HTTPError, KeyError, ValueError) as exc:
        logger.warning('ingredient filter failed for "%s": %s', ingredient, exc)
        return set()


async def _meal_ids_by_category(client: AsyncClient, category: str) -> set[str]:
    try:
        resp = await client.get(
            f'{THEMEALDB_BASE}filter.php',
            params={'c': category},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        meals = data.get('meals')
        if not meals:
            return set()
        return {m['idMeal'] for m in meals}
    except (HTTPError, KeyError, ValueError) as exc:
        logger.warning('category filter failed for "%s": %s', category, exc)
        return set()


async def _meal_ids_by_area(client: AsyncClient, area: str) -> set[str]:
    try:
        resp = await client.get(
            f'{THEMEALDB_BASE}filter.php',
            params={'a': area},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        meals = data.get('meals')
        if not meals:
            return set()
        return {m['idMeal'] for m in meals}
    except (HTTPError, KeyError, ValueError) as exc:
        logger.warning('area filter failed for "%s": %s', area, exc)
        return set()


async def _lookup_recipes(client: AsyncClient, ids: list[str]) -> list[RecipeItem]:
    async def fetch_one(id_: str) -> dict | None:
        try:
            resp = await client.get(
                f'{THEMEALDB_BASE}lookup.php',
                params={'i': id_},
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            meals = data.get('meals')
            if not meals:
                return None
            raw = meals[0]
            return raw if isinstance(raw, dict) else None
        except (HTTPError, KeyError, ValueError) as exc:
            logger.warning('recipe lookup failed for id "%s": %s', id_, exc)
            return None

    async with log_duration(f'themealdb.lookup_batch({len(ids)})'):
        raw_meals = await asyncio.gather(*[fetch_one(id_) for id_ in ids])

    return [_meal_to_item(m) for m in raw_meals if isinstance(m, dict)]


def _meal_to_item(meal: dict) -> RecipeItem:
    ingredients: list[str] = []
    measurements: list[str] = []
    for i in range(1, 21):
        ing = (meal.get(f'strIngredient{i}') or '').strip()
        meas = (meal.get(f'strMeasure{i}') or '').strip()
        if ing:
            ingredients.append(ing)
            measurements.append(meas)

    tags_str = (meal.get('strTags') or '').strip()
    tags = [t.strip() for t in tags_str.split(',') if t.strip()]

    return RecipeItem(
        id=meal['idMeal'],
        name=meal.get('strMeal', ''),
        category=meal.get('strCategory') or None,
        area=meal.get('strArea') or None,
        ingredients=ingredients,
        measurements=measurements,
        instructions=(meal.get('strInstructions') or '').strip(),
        thumbnail_url=meal.get('strMealThumb') or None,
        tags=tags,
        youtube_url=meal.get('strYoutube') or None,
        source_url=meal.get('strSource') or None,
        source='mealdb',
    )


async def lookup_recipe_by_id(client: AsyncClient, id_: str) -> RecipeItem | None:
    try:
        async with log_duration('themealdb.lookup_one'):
            resp = await client.get(
                f'{THEMEALDB_BASE}lookup.php',
                params={'i': id_},
                timeout=15,
            )
        resp.raise_for_status()
        meals = (resp.json()).get('meals')
        if not meals:
            return None
        raw = meals[0]
        if not isinstance(raw, dict):
            return None
        return _meal_to_item(raw)
    except (HTTPError, KeyError, ValueError) as exc:
        logger.warning('recipe lookup failed for id "%s": %s', id_, exc)
        return None


async def _search_recipes_internal(
    client: AsyncClient,
    category: str | None = None,
    ingredients: list[str] | None = None,
    area: str | None = None,
) -> list[RecipeItem]:
    if not any([category, ingredients, area]):
        return []

    tasks: list = []
    n_ingredients = 0
    has_category = False
    has_area = False

    if ingredients:
        for ing in ingredients:
            tasks.append(_meal_ids_by_ingredient(client, ing))
            n_ingredients += 1

    if category:
        tasks.append(_meal_ids_by_category(client, category))
        has_category = True

    if area:
        tasks.append(_meal_ids_by_area(client, area))
        has_area = True

    if not tasks:
        return []

    async with log_duration('themealdb.filter_gather'):
        results = await asyncio.gather(*tasks)
    idx = 0
    id_sets: list[set[str]] = []

    if n_ingredients:
        union_ids: set[str] = set()
        for _ in range(n_ingredients):
            union_ids |= results[idx]
            idx += 1
        id_sets.append(union_ids)

    if has_category:
        id_sets.append(results[idx])
        idx += 1

    if has_area:
        id_sets.append(results[idx])
        idx += 1

    result_ids = id_sets[0]
    for s in id_sets[1:]:
        result_ids &= s

    if not result_ids:
        return []

    async with log_duration('themealdb.lookup_recipes'):
        return await _lookup_recipes(client, list(result_ids))


@tool
async def search_recipes(
    category: str | None = None,
    ingredients: list[str] | None = None,
    area: str | None = None,
) -> list[RecipeItem]:
    """Search for recipes matching the given criteria.

    category: A meal category (Dessert, Chicken, Seafood, Vegetarian, Pasta, Beef, etc.)
    ingredients: Ingredient names — returns recipes containing ANY of them
    area: A cuisine region (Italian, Mexican, Japanese, Indian, Canadian, Chinese, etc.)

    At least one parameter is required.
    """
    async with AsyncClient() as client:
        return await _search_recipes_internal(client, category, ingredients, area)


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
