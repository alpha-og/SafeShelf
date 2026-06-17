import asyncio
import logging

from httpx import AsyncClient, HTTPError
from langchain_core.tools import tool
from pydantic import BaseModel

import app.shared._patch_platform  # noqa: F401 — system SSL cert store for httpx

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
            return meals[0]
        except (HTTPError, KeyError, ValueError) as exc:
            logger.warning('recipe lookup failed for id "%s": %s', id_, exc)
            return None

    raw_meals = await asyncio.gather(*[fetch_one(id_) for id_ in ids])

    def to_item(meal: dict) -> RecipeItem:
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
        )

    return [to_item(m) for m in raw_meals if m is not None]


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
