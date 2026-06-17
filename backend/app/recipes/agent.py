import asyncio
import logging
import re

from httpx import AsyncClient
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from app.recipes.tools import (
    RecipeItem,
    _search_recipes_internal,
)
from app.shared.config import settings

logger = logging.getLogger(__name__)

class RecipeQuery(BaseModel):
    is_recipe_query: bool = True
    categories: list[str] = []
    ingredients: list[str] = []
    areas: list[str] = []
    exclude_ingredients: list[str] = []


class ValidationResult(BaseModel):
    is_valid: bool
    reason: str | None = None
    code: str | None = None


class RecipeSearchResult(BaseModel):
    success: bool
    recipes: list[RecipeItem] = []
    error: str | None = None
    rejected: bool = False
    rejection_reason: str | None = None


EXTRACTION_PROMPT = """\
You are a recipe search parameter extractor. Parse the user's food and cooking \
query into structured fields.

--- FIELDS ---

is_recipe_query (bool, default true):
  Whether the query is about food, cooking, or recipes. Set to false when the \
query is clearly unrelated (e.g., "what's the weather", "tell me a joke").

categories (list[str]):
  TheMealDB meal categories mentioned.
  Valid values: Beef, Chicken, Dessert, Lamb, Miscellaneous, Pasta, Pork, \
Seafood, Side, Starter, Vegan, Vegetarian, Breakfast, Goat
  Rules:
  - If a food term matches BOTH a category AND a common ingredient
    (e.g., "chicken", "beef", "pork"), include it in BOTH categories
    AND ingredients.
  - For "or" groupings (e.g., "chicken or beef recipes"), put each
    option in categories.
  - For meal-type labels (e.g., "desserts", "seafood dishes",
    "breakfast ideas"), use the matching category.
  - For "and" groupings (e.g., "vegetarian desserts"), put each
    option in categories.

ingredients (list[str]):
  Specific food items the user wants IN every returned recipe.
  Rules:
  - For "and" relationships (e.g., "chicken with garlic and tomatoes"),
    include all of them.
  - For "or" relationships (e.g., "chicken or beef"), leave this empty
    and use categories instead.
  - Include common ingredient names (e.g., "chicken breast", "garlic",
    "tomato", "olive oil", "rice", "onion").
  - Do NOT include preparation methods, cooking techniques, or dietary
    labels (e.g., "vegetarian", "gluten-free").

areas (list[str]):
  Cuisine regions or countries mentioned. Any nationality demonym or
  country name that describes the style of food.
  Common examples: American, British, Canadian, Chinese, French, Greek, \
Indian, Irish, Italian, Japanese, Mexican, Moroccan, Polish, Spanish, \
Thai, Vietnamese
  (The API supports many more nationalities — extract any demonym you
  recognise as a cuisine origin.)

exclude_ingredients (list[str]):
  Ingredients the user explicitly wants to avoid. Only populate when the
  user says "without", "no", "excluding", "except", or similar negative
  qualifiers.

--- EXAMPLES ---

Query: "find me Italian chicken recipes with garlic and tomatoes"
  is_recipe_query: true
  categories: ["Chicken"]
  ingredients: ["chicken", "garlic", "tomato"]
  areas: ["Italian"]
  exclude_ingredients: []

Query: "chicken or beef recipes"
  is_recipe_query: true
  categories: ["Chicken", "Beef"]
  ingredients: []
  areas: []
  exclude_ingredients: []

Query: "desserts without chocolate"
  is_recipe_query: true
  categories: ["Dessert"]
  ingredients: []
  areas: []
  exclude_ingredients: ["chocolate"]

Query: "vegan pasta with mushrooms no cheese"
  is_recipe_query: true
  categories: ["Pasta", "Vegan"]
  ingredients: ["mushrooms"]
  areas: []
  exclude_ingredients: ["cheese"]

Query: "what's the weather in Tokyo"
  is_recipe_query: false
  (all other fields empty)

--- OUTPUT ---

Return ONLY a valid JSON object that matches the schema above exactly.
No markdown, no explanation, no extra fields."""

ESSENTIAL_INGREDIENTS: dict[str, list[str]] = {
    'omelette': ['eggs', 'egg'],
    'omelet': ['eggs', 'egg'],
    'chicken curry': ['chicken'],
    'chicken soup': ['chicken'],
    'chicken stew': ['chicken'],
    'beef stew': ['beef'],
    'beef soup': ['beef'],
    'beef curry': ['beef'],
    'cheesecake': ['cream cheese'],
    'pizza': ['cheese', 'dough', 'flour'],
    'bread': ['flour'],
    'cake': ['flour', 'eggs'],
    'ice cream': ['cream', 'milk'],
    'pasta': ['pasta'],
    'mac and cheese': ['cheese', 'pasta'],
    'macaroni and cheese': ['cheese', 'pasta'],
    'grilled cheese': ['cheese', 'bread'],
    'hollandaise': ['eggs', 'butter'],
    'mayonnaise': ['eggs', 'oil'],
    'meringue': ['eggs'],
    'creme brulee': ['eggs', 'cream'],
    'pancakes': ['flour', 'eggs'],
    'waffles': ['flour', 'eggs'],
    'brownies': ['chocolate', 'flour', 'eggs'],
    'custard': ['eggs', 'milk'],
}

UNSAFE_INGREDIENTS: set[str] = {
    'fugu',
    'pufferfish',
    'blowfish',
    'death cap',
    'destroying angel',
    'false morel',
    'raw cassava',
    'bitter cassava',
    'raw kidney bean',
    'underdone kidney bean',
    'green potato',
    'raw potato',
    'raw fava bean',
    'ackee',
    'star fruit',
    'raw rhubarb leaf',
}

_DISORDERED_PATTERNS: list[re.Pattern] = [
    re.compile(r'water\s*only'),
    re.compile(r'starvation'),
    re.compile(r'eat\s*nothing'),
    re.compile(r'master\s*cleanse'),
    re.compile(r'juice\s*fast'),
    re.compile(r'extreme\s*(low.calorie|restrict)'),
    re.compile(r'(anorexia|bulimia)'),
    re.compile(r'dangerous\s*(diet|weight.loss)'),
]

_DISORDERED_KEYWORDS: set[str] = {
    'detox',
    'cleanse',
    '1200 calorie',
    'starvation diet',
    'dangerous weight loss',
    'fasting for',
}

def _check_direct_contradiction(q: RecipeQuery) -> str | None:
    overlap = set(q.ingredients) & set(q.exclude_ingredients)
    if overlap:
        items = ', '.join(sorted(overlap))
        return (
            f'Query both includes and excludes the same ingredient(s): {items}. '
            'Cannot satisfy contradictory requirements.'
        )
    return None


def _check_essential_ingredients(query: str, q: RecipeQuery) -> str | None:
    q_lower = query.lower()
    excluded_lower = {i.lower() for i in q.exclude_ingredients}
    for dish, essentials in ESSENTIAL_INGREDIENTS.items():
        if dish not in q_lower:
            continue
        for essential in essentials:
            if essential.lower() in excluded_lower:
                return (
                    f'A "{dish.title()}" inherently requires {essential}, which you '
                    f'asked to exclude. Try a different dish instead.'
                )
    return None


def _check_unsafe_ingredients(q: RecipeQuery) -> str | None:
    for ing in q.ingredients:
        if ing.strip().lower() in UNSAFE_INGREDIENTS:
            return (
                f'"{ing}" is potentially toxic or dangerous. '
                'Recipe searches for this ingredient are not permitted.'
            )
    return None


def _check_disordered_eating(query: str) -> str | None:
    q_lower = query.lower()
    for pattern in _DISORDERED_PATTERNS:
        if pattern.search(q_lower):
            return (
                'This query appears to promote disordered eating or unsafe dietary '
                'practices and cannot be processed.'
            )
    for kw in _DISORDERED_KEYWORDS:
        if kw in q_lower:
            return (
                'This query appears to promote disordered eating or unsafe dietary '
                'practices and cannot be processed.'
            )
    return None


def validate_query(query: str, q: RecipeQuery) -> ValidationResult:
    checks: list[tuple[str, str | None]] = [
        ('contradiction', _check_direct_contradiction(q)),
        ('unsafe_ingredient', _check_unsafe_ingredients(q)),
        ('disordered_eating', _check_disordered_eating(query)),
    ]

    for code, reason in checks:
        if reason is not None:
            return ValidationResult(is_valid=False, reason=reason, code=code)

    essential_reason = _check_essential_ingredients(query, q)
    if essential_reason is not None:
        return ValidationResult(
            is_valid=False, reason=essential_reason, code='contradiction'
        )

    return ValidationResult(is_valid=True)


_TOKEN_RE = re.compile(r'[a-z]+')


def _match_ingredient(recipe_ingredient: str, search_term: str) -> bool:
    """Match a search term against a single recipe ingredient name.

    Uses token-aware matching to avoid false positives (e.g. "egg" matching
    "eggplant"). Matches exact tokens, plural/singular suffixed forms, and
    the y/ies conversion.
    """
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


def _has_all_ingredients(recipe: RecipeItem, needed: list[str]) -> bool:
    recipe_names = recipe.ingredients
    return all(
        any(_match_ingredient(rn, need) for rn in recipe_names) for need in needed
    )


def _has_any_excluded(recipe: RecipeItem, excluded: list[str]) -> bool:
    recipe_names = recipe.ingredients
    return any(
        any(_match_ingredient(rn, excl) for rn in recipe_names) for excl in excluded
    )


async def run_search(client: AsyncClient, q: RecipeQuery) -> list[RecipeItem]:
    if not q.categories and not q.areas and not q.ingredients:
        return []

    cats: list[str | None] = q.categories or [None]
    areas: list[str | None] = q.areas or [None]
    primary = q.ingredients[:1] if q.ingredients else None

    tasks = []
    for cat in cats:
        for area in areas:
            if cat is not None or area is not None or primary is not None:
                tasks.append(
                    _search_recipes_internal(client, cat, primary, area)
                )

    if not tasks:
        return []

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
        deduped = [
            r for r in deduped if not _has_any_excluded(r, q.exclude_ingredients)
        ]

    return deduped


_llm: ChatOpenAI | None = None


def _get_llm() -> ChatOpenAI:
    global _llm
    if _llm is None:
        _llm = ChatOpenAI(
            model=settings.GROQ_MODEL,
            api_key=settings.GROQ_API_KEY,
            base_url='https://api.groq.com/openai/v1',
            temperature=0,
        )
    return _llm


async def extract_query(query: str) -> RecipeQuery:
    prompt = ChatPromptTemplate.from_messages([
        ('system', EXTRACTION_PROMPT),
        ('human', '{query}'),
    ])
    chain = prompt | _get_llm().with_structured_output(RecipeQuery, method='json_mode')
    return await chain.ainvoke({'query': query})


async def recipe_search(query: str) -> RecipeSearchResult:
    if not query or not query.strip():
        return RecipeSearchResult(
            success=False,
            error='Query is empty.',
        )

    try:
        extracted = await extract_query(query)

        if not extracted.is_recipe_query:
            return RecipeSearchResult(
                success=False,
                error='Query is not related to recipes or food.',
            )

        validation = validate_query(query, extracted)
        if not validation.is_valid:
            return RecipeSearchResult(
                success=False,
                rejected=True,
                rejection_reason=validation.reason,
            )

        async with AsyncClient() as client:
            recipes = await run_search(client, extracted)

        return RecipeSearchResult(success=True, recipes=recipes)

    except Exception as exc:
        return RecipeSearchResult(success=False, error=str(exc))
