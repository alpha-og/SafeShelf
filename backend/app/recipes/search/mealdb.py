from __future__ import annotations

import asyncio
import logging

from httpx import AsyncClient, HTTPError
from langchain_core.tools import tool

import app.shared._patch_platform  # noqa: F401 — system SSL cert store for httpx
from app.recipes.schemas import RecipeItem, RecipeQuery
from app.shared.timing import log_duration

logger = logging.getLogger(__name__)

THEMEALDB_BASE = 'https://www.themealdb.com/api/json/v1/1/'


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
        author_name=None,
        source='mealdb',
        servings=None,
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


async def _execute_search(client: AsyncClient, q: RecipeQuery) -> list[RecipeItem]:
    from app.recipes.search.db import _has_all_ingredients, _has_any_excluded

    if not q.categories and not q.areas and not q.ingredients:
        return []

    cats: list[str | None] = q.categories or [None]
    areas: list[str | None] = q.areas or [None]
    primary = q.ingredients[:1] if q.ingredients else None

    tasks = []
    for cat in cats:
        for area in areas:
            if cat is not None or area is not None or primary is not None:
                tasks.append(_search_recipes_internal(client, cat, primary, area))

    if not tasks:
        return []

    async with log_duration('themealdb.gather'):
        results = await asyncio.gather(*tasks)

    seen: set[str] = set()
    deduped: list[RecipeItem] = []
    for batch in results:
        for r in batch:
            if r.id not in seen:
                seen.add(r.id)
                deduped.append(r)

    if q.ingredients:
        deduped = [r for r in deduped if _has_all_ingredients(r, q.ingredients)]

    if q.exclude_ingredients:
        deduped = [r for r in deduped if not _has_any_excluded(r, q.exclude_ingredients)]

    return deduped


_FALLBACK_CATEGORIES = ['Chicken', 'Seafood', 'Pasta', 'Beef', 'Vegetarian', 'Dessert']


async def _fallback_search(client: AsyncClient) -> list[RecipeItem]:
    tasks = [_search_recipes_internal(client, cat, None, None) for cat in _FALLBACK_CATEGORIES]
    async with log_duration('themealdb.fallback_gather'):
        results = await asyncio.gather(*tasks)
    seen: set[str] = set()
    deduped: list[RecipeItem] = []
    for batch in results:
        for r in batch:
            if r.id not in seen:
                seen.add(r.id)
                deduped.append(r)
    return deduped


async def run_search(client: AsyncClient, q: RecipeQuery) -> list[RecipeItem]:
    # Exact search with all constraints
    async with log_duration('search.initial'):
        results = await _execute_search(client, q)
    if results:
        return results

    # Relaxation 1: drop ingredient constraint if there was one
    if q.ingredients:
        async with log_duration('search.relax_ingredients'):
            results = await _execute_search(client, q.model_copy(update={'ingredients': []}))
        if results:
            return results

    # Relaxation 2: drop area constraint too
    if q.areas:
        async with log_duration('search.relax_areas'):
            results = await _execute_search(
                client,
                q.model_copy(update={'areas': [], 'ingredients': []}),
            )
        if results:
            return results

    # Ultimate fallback: popular categories
    async with log_duration('search.fallback'):
        return await _fallback_search(client)
