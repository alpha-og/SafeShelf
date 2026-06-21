import asyncio
import logging
import re

from httpx import AsyncClient
from langchain_core.messages import SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, ConfigDict, Field
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.recipes.models import Recipe
from app.recipes.schemas import AdjustedIngredient
from app.recipes.tools import (
    RecipeItem,
    _build_ingredient_filter,
    _search_recipes_internal,
    recipe_to_item,
)
from app.shared.config import settings
from app.shared.timing import log_duration

logger = logging.getLogger(__name__)


class ClarificationField(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    label: str
    description: str | None = None
    schema_: dict = Field(default={}, validation_alias='schema', serialization_alias='schema')


class RecipeQuery(BaseModel):
    is_recipe_query: bool = True
    categories: list[str] = []
    ingredients: list[str] = []
    areas: list[str] = []
    exclude_ingredients: list[str] = []
    search_text: str = ''
    needs_clarification: bool = False
    clarifications: list[ClarificationField] = []


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
  Whether the query is about food, cooking, or recipes. Default to true for \
ANY query that could plausibly relate to food, cooking, eating, meals, or \
recipes — err on the side of inclusion. Only set to false when the query is \
definitively about something else (e.g., "what's the weather", "tell me a \
joke", "how do I fix my car").

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

search_text (str, default ""):
  The user's own free-text food terms from their original query — especially
  terms that describe a type of dish, cooking method, or food category that
  does NOT fit neatly into categories, ingredients, or areas above. This
  field is used as a fuzzy name/description match in the recipe database.
  Rules:
  - Always include the user's original food-related search terms here,
    even when they also appear in other fields.
  - Examples of terms to put here: "pastry", "casserole", "one pot",
    "sheet pan", "crockpot", "salad", "soup", "stew", "cookies",
    "muffins", "bread", "pie", "pudding", "dip", "skillet".
  - For queries that are already fully captured by categories,
    ingredients, or areas (e.g. "chicken" → category + ingredient),
    leave this empty — the other fields suffice.
  - Do NOT copy the entire Additional context block into this field.
    Only include the user's ORIGINAL query terms.

--- CONCEPTUAL INFERENCE ---

When the query describes a cooking scenario, mood, climate, season,
occasion, or dietary preference (rather than a specific dish, ingredient,
or named cuisine), infer plausible categories, areas, and ingredients
that match the intent. Be inclusive — include multiple likely options
when uncertain. Downstream deduplication handles breadth.

Common associations:
- "warm climate", "hot weather", "tropical" → cuisines from hot/tropical
  regions (Thai, Mexican, Indian, Caribbean, Malaysian, Filipino, Spanish,
  Vietnamese); light ingredients (seafood, coconut, lime, mango, chili)
- "cold weather", "winter", "hearty" → braised/roasted/stewed dishes
  (Beef, Pork, Lamb, Chicken); areas (British, Irish, Polish, American);
  hearty ingredients (potato, beef, root vegetables)
- "comfort food", "soul food" → hearty American/British categories
  (Beef, Chicken, Pasta, Pork, Dessert); areas (American, British,
  Italian) — avoid health-oriented categories like Vegan, Vegetarian
- "light", "summer", "fresh", "healthy" → lighter categories (Seafood,
  Side, Vegetarian, Vegan); areas (Italian, Greek, Japanese, Mexican,
  Mediterranean)
- "quick", "easy", "weeknight", "simple" → fast categories (Chicken,
  Pasta, Seafood, Side); common quick ingredients (eggs, pasta, rice,
  chicken breast)
- "spicy" → areas (Mexican, Indian, Thai, Caribbean, Jamaican, Korean);
  ingredients (chili, pepper, curry)
- "breakfast", "brunch" → categories (Breakfast); ingredients (eggs,
  bacon, pancake, toast)
- "party", "appetizer", "snack" → categories (Starter, Side,
  Miscellaneous); areas []
- "dinner", "supper", "evening meal" → hearty categories (Beef, Chicken,
  Pasta, Pork, Seafood); broad areas
- "lunch", "midday" → lighter categories (Chicken, Seafood, Side)
- single ingredient query like just "chicken", "beef", "pasta" → include
  the ingredient AND its matching category; broad areas for variety

needs_clarification (bool, default false):
  Set to true when the query is ambiguous about what the user actually \
wants to eat. If the query mentions specific ingredients, dish names, or \
cuisines you can infer from (e.g., "chicken", "pasta", "Italian", "taco"), \
set to false and extract those. If the query is vague about the actual \
food (e.g., "something healthy", "comfort food", "dinner", "surprise me", \
"quick meal", "feed me"), set to true and ask clarifying questions about \
what they're looking for. Err on the side of asking — users would rather \
answer a quick question than scroll through irrelevant results.

clarifications (list[object]):
  When needs_clarification is true, provide 1-3 questions to clarify the \
user's intent. Each question must have:
  - id: short unique identifier
  - label: the question text shown to the user
  - description: optional helper text
  - schema: a JSON Schema fragment describing the expected answer format

  Supported schema patterns:
  - Single choice: { "type": "string", "enum": ["A", "B", "C"] }
  - Multi choice: { "type": "array", "items": { "type": "string", \
"enum": ["A", "B", "C"] }, "uniqueItems": true }
  - Free text: { "type": "string" }
  - Number: { "type": "integer" }
  - Yes/No: { "type": "boolean" }

  Prefer enum choices when possible. Use free text only as fallback.
  Keep questions independent — the user should be able to answer them all \
in one go.
--- EXAMPLES ---

Query: "warm climate dishes"
  is_recipe_query: true
  categories: ["Seafood", "Side", "Miscellaneous"]
  ingredients: ["coconut", "lime"]
  areas: ["Thai", "Mexican", "Indian", "Caribbean", "Spanish", "Vietnamese"]
  exclude_ingredients: []

Query: "comfort food ideas"
  is_recipe_query: true
  categories: ["Beef", "Chicken", "Pasta", "Pork", "Dessert"]
  ingredients: []
  areas: ["American", "Italian", "British", "Irish"]
  exclude_ingredients: []

Query: "light summer meals"
  is_recipe_query: true
  categories: ["Seafood", "Side", "Vegetarian", "Vegan"]
  ingredients: []
  areas: ["Italian", "Greek", "Japanese", "Mexican"]
  exclude_ingredients: []

Query: "quick weeknight dinner"
  is_recipe_query: true
  categories: ["Chicken", "Pasta", "Seafood", "Side"]
  ingredients: []
  areas: []
  exclude_ingredients: []

Query: "spicy food"
  is_recipe_query: true
  categories: ["Chicken", "Pork", "Seafood", "Miscellaneous"]
  ingredients: ["chili"]
  areas: ["Mexican", "Indian", "Thai", "Caribbean", "Jamaican", "Korean", "Chinese"]
  exclude_ingredients: []

--- EXAMPLES (continued) ---

Query: "find me Italian chicken recipes with garlic and tomatoes"
  is_recipe_query: true
  categories: ["Chicken"]
  ingredients: ["chicken", "garlic", "tomato"]
  areas: ["Italian"]
  exclude_ingredients: []
  needs_clarification: false
  clarifications: []

Query: "chicken or beef recipes"
  is_recipe_query: true
  categories: ["Chicken", "Beef"]
  ingredients: []
  areas: []
  exclude_ingredients: []
  needs_clarification: false
  clarifications: []

Query: "something healthy for dinner"
  is_recipe_query: true
  needs_clarification: true
  clarifications:
    - id: cuisine
      label: What type of cuisine are you in the mood for?
      schema: { "type": "string", "enum": ["Italian", "Japanese", \
"Mexican", "Indian", "American", "Mediterranean", "No preference"] }
    - id: diet
      label: Any dietary preference?
      schema: { "type": "string", "enum": ["No preference", \
"Vegetarian", "Vegan", "Low-calorie", "High-protein", "Gluten-free"] }

Query: "what's the weather in Tokyo"
  is_recipe_query: false

Query: "comfort food with chicken"
  is_recipe_query: true
  categories: ["Chicken"]
  ingredients: ["chicken"]
  areas: ["American", "Italian", "British", "Irish"]
  needs_clarification: false
  clarifications: []

Query: "chicken"
  is_recipe_query: true
  categories: ["Chicken"]
  ingredients: ["chicken"]
  areas: []
  needs_clarification: false
  clarifications: []

Query: "dinner ideas"
  is_recipe_query: true
  needs_clarification: true
  clarifications:
    - id: preference
      label: What kind of food are you craving?
      schema: { "type": "string", "enum": ["Something light & healthy", \
"Hearty comfort food", "Quick & easy", "Surprise me"] }
    - id: cuisine
      label: Any cuisine preference?
      schema: { "type": "string", "enum": ["No preference", \
"Italian", "Mexican", "Japanese", "Indian", "American", "Mediterranean"] }

Query: "surprise me"
  is_recipe_query: true
  needs_clarification: true
  clarifications:
    - id: preference
      label: What sounds good to you right now?
      schema: { "type": "string", "enum": ["Something healthy", \
"Hearty comfort food", "Quick & easy", "I'll pick"] }
    - id: cuisine
      label: Any cuisine preference?
      schema: { "type": "string", "enum": ["No preference", \
"Italian", "Mexican", "Japanese", "Indian", "American", "Mediterranean"] }

Query: "feed me"
  is_recipe_query: true
  needs_clarification: true
  clarifications:
    - id: preference
      label: What sounds good to you right now?
      schema: { "type": "string", "enum": ["Something healthy", \
"Hearty comfort food", "Quick & easy", "Surprise me", "I'll pick"] }
    - id: cuisine
      label: Any cuisine preference?
      schema: { "type": "string", "enum": ["No preference", \
"Italian", "Mexican", "Japanese", "Indian", "American", "Mediterranean"] }

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
        return ValidationResult(is_valid=False, reason=essential_reason, code='contradiction')

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
    return all(any(_match_ingredient(rn, need) for rn in recipe_names) for need in needed)


def _has_any_excluded(recipe: RecipeItem, excluded: list[str]) -> bool:
    recipe_names = recipe.ingredients
    return any(any(_match_ingredient(rn, excl) for rn in recipe_names) for excl in excluded)


async def _execute_search(client: AsyncClient, q: RecipeQuery) -> list[RecipeItem]:
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


async def extract_query(query: str, system_extra: str | None = None) -> RecipeQuery:
    messages = [SystemMessage(content=EXTRACTION_PROMPT)]
    if system_extra:
        messages.append(SystemMessage(content=system_extra))
    messages.append(('human', '{query}'))
    prompt = ChatPromptTemplate.from_messages(messages)
    chain = prompt | _get_llm().with_structured_output(RecipeQuery, method='json_mode')
    async with log_duration('llm.ainvoke'):
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
        words = set(re.findall(r'[a-z]+', q.search_text.lower()))
        for w in sorted(words, key=len, reverse=True):
            if len(w) > 2:
                conditions.append(Recipe.name.ilike(f'%{w}%'))

    stmt = select(Recipe)
    if conditions:
        stmt = stmt.where(*conditions)
    stmt = stmt.limit(_DB_SEARCH_LIMIT)
    rows = (await session.exec(stmt)).all()

    items = [recipe_to_item(r) for r in rows]

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
    async with AsyncClient() as client:
        return await run_search(client, q)


class QuantitiesAdjustment(BaseModel):
    ingredients: list[AdjustedIngredient]


QUANTITY_ADJUSTMENT_PROMPT = """\
You are a recipe quantity adjuster. Given a recipe's ingredients and \
measurements, a desired number of servings, and the user's dietary profile, \
adjust each measurement accordingly.

CRITICAL — EVERY output measurement MUST include a unit:
Every non-empty, non-garnish adjusted_measurement MUST include a unit. If the \
input is a bare number with no unit, infer the unit from the ingredient name. \
This is the most important rule. Examples:
  Input: "450" + ingredient "milk"     → Output: "450 ml"
  Input: "1" + ingredient "onions"     → Output: "1 onion"
  Input: "1/2" + ingredient "sugar"    → Output: "1/2 cup"
  Input: "3/4" + ingredient "flour"    → Output: "3/4 cup"
  Input: "" + ingredient "salt"        → Output: ""  (empty stays empty)
  Input: "2 tbsp" + ingredient "oil"   → Output: "1 tbsp"  (preserve existing unit)

--- MEASUREMENT FORMATS YOU WILL ENCOUNTER ---

The measurement data comes from different sources and may be in various formats.
Handle each as follows:

1. Unitless numbers (e.g., "1", "450", "1/2", "0.75", "2 -3"):
   The unit is implied by the ingredient. Add the inferred unit to the output.
   - "450" + "milk" → "450 ml"
   - "450" + "flour" → "450 g"
   - "1" + "onions" → "1 onion"
   - "1/2" + "sugar" → "1/2 cup"
   For ranges ("2 -3"), take the midpoint, scale, then express as a range again.

2. Number + unit (e.g., "3/4 cup", "250g", "2 tablespoons"):
   Scale the number, keep the unit. If the scaled amount becomes too large for
   the unit (e.g., "12 tsp"), convert to a larger unit ("1/4 cup").

3. Number + unit + prep note (e.g., "1 finely chopped ", "2 cloves chopped"):
   Scale only the number. Keep the prep note completely unchanged.
   Example: "1 finely chopped " with ratio 2x → "2 finely chopped "

4. "Juice of X" / "zest of X" style (e.g., "Juice of 1", "Zest of 2"):
   Scale the count, keep the phrasing.
   Example: "Juice of 1" with ratio 2x → "Juice of 2"

5. Empty string "":
   Leave as empty string. Not all ingredients have precise measurements.

6. Garnish/serving labels (e.g., "to serve", "Garnish with", "Topping"):
   Leave completely unchanged — these describe how to use the ingredient,
   not a quantity.

7. Mixed/dual units (e.g., "175g/6oz", "1 (12 oz.)"):
   Keep the same format, scale both values.
   Example: "175g/6oz" with ratio 0.5x → "88g/3oz"

8. Bare fractions (e.g., "1/2", "3/4", "1 1/2"):
   Convert to decimal, scale, convert back to a common fraction.
   Use standard cooking fractions: 1/4, 1/3, 1/2, 2/3, 3/4.

--- SCALING RULES ---

1. Multiply each numeric value by desired_servings / original_servings.
   If original_servings is unknown, assume 4.

2. Round to sensible cooking measurements:
   - Use common fractions (1/4, 1/3, 1/2, 2/3, 3/4)
   - Round to the nearest reasonable cooking increment
   - Never output raw decimals like 0.333 — use "1/3"

3. When scaling produces a very small amount (below 1/4 tsp or roughly 1g),
   use "to taste" or "a pinch" as appropriate.

--- PROFILE-AWARE ADJUSTMENTS ---

- "low-sodium": reduce salt/soy/salted ingredients by roughly 1/3 to 1/2.
  Add a note like "reduced for low-sodium diet".
- "low-sugar": reduce sugar/honey/sweeteners by roughly 1/4 to 1/3.
  Add a note like "reduced for low-sugar diet".
- "low-fat" / "low-saturated-fat": suggest reduced oil/butter/fat amounts.
  Add a note explaining the reduction.
- Allergens: leave the quantity as-is but append a note flagging the allergen.
  Do NOT remove the ingredient.

--- OUTPUT ---

Return a JSON object with a single key "ingredients" — an array of objects,
each with:
- ingredient: the ingredient name (copy from input)
- original_measurement: the original measurement string (copy from input)
- adjusted_measurement: the new measurement string after scaling and adjustment.
  MUST include a unit unless the original was empty or a garnish label.
- note: a brief explanation if adjusted for dietary reasons, or null

NO BARE NUMBERS ALLOWED. Every value in adjusted_measurement must have a unit.
Bare numbers like "2" or "3/4" are FORBIDDEN — use "2 cups" or "3/4 cup".
If you don't know the unit, write the number and then infer the unit from the
ingredient name (e.g., milk → ml, flour → cup, salt → tsp, egg → no unit needed).
An output like "2" or "1/4" WILL BE REJECTED.

NO DECIMAL NUMBERS ALLOWED. Use fractions instead of decimals:
  "0.5 cup" → "1/2 cup"
  "1.5 ml" → "1 1/2 ml"
  "0.333 tsp" → "1/3 tsp"
  "2.25 cups" → "2 1/4 cups"
Raw decimals like "0.5" or "1.5" are FORBIDDEN and WILL BE REJECTED.

Return ONLY valid JSON. No markdown, no explanation, no extra fields."""


async def adjust_quantities(
    ingredients: list[str],
    measurements: list[str],
    original_servings: int | None,
    desired_servings: int,
    dietary_preferences: list[str] | None = None,
    conditions: list[str] | None = None,
    allergens: list[str] | None = None,
    recipe_name: str | None = None,
) -> QuantitiesAdjustment:
    profile_parts = []
    if dietary_preferences:
        profile_parts.append(f"Dietary preferences: {', '.join(dietary_preferences)}")
    if conditions:
        profile_parts.append(f"Medical conditions: {', '.join(conditions)}")
    if allergens:
        profile_parts.append(f"Allergens to avoid: {', '.join(allergens)}")

    profile_text = "\n".join(profile_parts) if profile_parts else "No special dietary requirements."

    ingredients_text = "\n".join(
        f"{i + 1}. {ing} — {meas}" for i, (ing, meas) in enumerate(zip(ingredients, measurements))
    )

    # Prevent division by zero
    ratio = desired_servings / (original_servings or 4)

    user_message = f"""\
Recipe: {recipe_name or 'Untitled'}

Original servings: {original_servings or 'Unknown (assume 4)'}
Desired servings: {desired_servings} (scale factor: {ratio:.2f}x)

User profile:
{profile_text}

Ingredients and measurements:
{ingredients_text}"""

    try:
        messages = [
            SystemMessage(content=QUANTITY_ADJUSTMENT_PROMPT),
            ("human", "{input}"),
        ]
        prompt = ChatPromptTemplate.from_messages(messages)
        chain = prompt | _get_llm().with_structured_output(QuantitiesAdjustment, method='json_mode')
        async with log_duration('llm.adjust_quantities'):
            result = await chain.ainvoke({"input": user_message})
        # Post-process: sanitize → infer units → format fractions
        for item in result.ingredients:
            item.adjusted_measurement = _sanitize_measurement(item.adjusted_measurement)
            item.adjusted_measurement = _infer_unit(item.adjusted_measurement, item.ingredient)
            item.adjusted_measurement = _format_measurement(item.adjusted_measurement)
        return result
    except Exception:
        logger.warning('LLM quantity adjustment failed, falling back to simple scaling')
        return _fallback_scale(ingredients, measurements, original_servings, desired_servings)


# ── Fallback: regex-based scaling when LLM is unavailable ──────────────────

_DECIMAL_RE = re.compile(r'(\d+\.\d+)')


def _format_measurement(s: str) -> str:
    """Convert decimal numbers in a measurement string to fractions."""
    if not s or not s.strip():
        return s

    def _replace_decimal(m: re.Match) -> str:
        val = float(m.group(1))
        return _format_frac(val)

    return _DECIMAL_RE.sub(_replace_decimal, s)


def _sanitize_measurement(s: str) -> str:
    """Strip hallucinated junk words keeping only numbers and recognized units."""
    if not s or not s.strip():
        return s
    tokens = s.split()

    # Find the range of consecutive numeric tokens at the start
    last_num_idx = -1
    for i, token in enumerate(tokens):
        if _FRACTION_RE.match(token):
            last_num_idx = i
        else:
            break
    if last_num_idx < 0:
        return s  # no numeric token found — leave as-is

    # Find first recognized unit keyword anywhere
    unit_idx = -1
    for i, token in enumerate(tokens):
        if token.lower().rstrip(',.') in _RECOGNIZED_UNITS:
            unit_idx = i
            break

    if unit_idx >= 0 and unit_idx > last_num_idx:
        # Numbers + unit — drop junk in between if any
        before = ' '.join(tokens[:last_num_idx + 1])
        return f'{before} {tokens[unit_idx]}'

    # No recognized unit — strip everything after the numeric portion
    return ' '.join(tokens[:last_num_idx + 1])


_FRACTION_RE = re.compile(
    r'(\d+)\s+(\d+)/(\d+)|'   # mixed number: "1 1/2"
    r'(\d+)/(\d+)|'            # simple fraction: "3/4"
    r'(\d+(?:\.\d+)?)'         # decimal or bare integer
)


def _parse_float(s: str) -> float | None:
    """Parse the first numeric value from a string (handles fractions too)."""
    m = _FRACTION_RE.search(s)
    if not m:
        return None
    if m.group(1):
        return int(m.group(1)) + int(m.group(2)) / int(m.group(3))
    if m.group(4):
        return int(m.group(4)) / int(m.group(5))
    return float(m.group(6))


def _format_frac(value: float) -> str:
    """Format a float as a sensible cooking fraction if appropriate."""
    whole = int(value)
    frac = value - whole
    if frac < 0.01:
        return str(whole) if whole else ''
    if frac > 0.99:
        return str(whole + 1)

    # Map common fractions
    best: tuple[float, str] = (1.0, '')
    for num, den in [(1, 8), (1, 6), (1, 4), (1, 3), (1, 2), (2, 3), (3, 4), (5, 6), (7, 8)]:
        diff = abs(frac - num / den)
        if diff < best[0]:
            best = (diff, f'{num}/{den}')
    if whole:
        return f'{whole} {best[1]}' if best[1] else str(whole)
    return best[1] if best[1] else str(round(value, 1))


def _replace_numeric(raw: str, new_val: float) -> str:
    """Replace the first numeric token in `raw` with the scaled value."""
    m = _FRACTION_RE.search(raw)
    if not m:
        return raw
    formatted = _format_frac(new_val)
    return raw[:m.start()] + formatted + raw[m.end():]


def _scale_one(
    measurement: str,
    ratio: float,
) -> str:
    """Scale one measurement string by ratio using pure math."""
    if not measurement or not measurement.strip():
        return measurement
    lower = measurement.strip().lower()
    # Leave garnish/serving labels untouched
    if lower in ('to serve', 'garnish with', 'topping', 'for garnish', 'for serving'):
        return measurement
    # Check for "juice of X" / "zest of X" pattern
    juice_match = re.match(r'(juice\s+of\s+)(\d+)', lower, re.IGNORECASE)
    if juice_match:
        scaled = max(1, round(int(juice_match.group(2)) * ratio))
        return juice_match.group(1) + str(scaled) + measurement[juice_match.end():]
    zest_match = re.match(r'(zest\s+of\s+)(\d+)', lower, re.IGNORECASE)
    if zest_match:
        scaled = max(1, round(int(zest_match.group(2)) * ratio))
        return zest_match.group(1) + str(scaled) + measurement[zest_match.end():]

    parsed = _parse_float(measurement)
    if parsed is None:
        return measurement
    scaled = parsed * ratio
    # Very small amounts → "to taste"
    if scaled < 0.05:
        return 'to taste'
    return _replace_numeric(measurement, scaled)


_UNIT_HINTS: list[tuple[str, str]] = [
    ('cup', 'cup'), ('cups', 'cup'), ('tablespoon', 'tbsp'), ('tablespoons', 'tbsp'),
    ('teaspoon', 'tsp'), ('teaspoons', 'tsp'), ('tbsp', 'tbsp'), ('tsp', 'tsp'),
    ('ounce', 'oz'), ('ounces', 'oz'), ('oz', 'oz'), ('pound', 'lb'), ('pounds', 'lb'),
    ('lb', 'lb'), ('lbs', 'lb'), ('ml', 'ml'), ('milliliter', 'ml'),
    ('liter', 'l'), ('litre', 'l'), ('l', 'l'),
    ('g', 'g'), ('gram', 'g'), ('grams', 'g'), ('kg', 'kg'), ('kilogram', 'kg'),
    ('pinch', 'pinch'), ('dash', 'dash'), ('clove', 'clove'), ('cloves', 'clove'),
    ('whole', ''), ('halved', ''), ('chopped', ''), ('minced', ''), ('diced', ''),
    ('sliced', ''), ('crushed', ''), ('grated', ''), ('peeled', ''),
]

# Recognized unit keywords (ones with a non-empty unit value)
_RECOGNIZED_UNITS = {kw for kw, unit in _UNIT_HINTS if unit}

# Ingredient keywords → unit to append when the measurement is unitless
_INFERRED_UNITS: list[tuple[str, str]] = [
    # liquids → ml
    ('milk', 'ml'), ('water', 'ml'), ('cream', 'ml'), ('broth', 'ml'), ('stock', 'ml'),
    ('juice', 'ml'), ('oil', 'ml'), ('vinegar', 'ml'), ('wine', 'ml'), ('sauce', 'ml'),
    ('honey', 'ml'), ('syrup', 'ml'), ('soy sauce', 'ml'), ('worcestershire', 'ml'),
    ('vanilla', 'ml'), ('extract', 'ml'), ('lemon juice', 'ml'), ('lime juice', 'ml'),
    # volume → cup
    ('sugar', 'cup'), ('flour', 'cup'), ('rice', 'cup'), ('cereal', 'cup'),
    ('butter', 'cup'), ('yogurt', 'cup'), ('sour cream', 'cup'),
    ('cheese', 'cup'), ('cocoa', 'cup'), ('chocolate', 'cup'), ('oat', 'cup'),
    ('breadcrumb', 'cup'), ('crumbs', 'cup'), ('walnut', 'cup'), ('almond', 'cup'),
    ('pecan', 'cup'), ('nut', 'cup'), ('seed', 'cup'), ('sesame', 'cup'),
    ('coconut', 'cup'), ('mayonnaise', 'cup'), ('ketchup', 'cup'), ('mustard', 'cup'),
    ('applesauce', 'cup'), ('pumpkin', 'cup'), ('squash', 'cup'), ('jam', 'cup'),
    ('jelly', 'cup'), ('preserve', 'cup'), ('marmalade', 'cup'), ('chutney', 'cup'),
    ('relish', 'cup'), ('hummus', 'cup'), ('guacamole', 'cup'), ('dip', 'cup'),
    ('spread', 'cup'), ('pesto', 'cup'), ('tahini', 'cup'), ('peanut butter', 'cup'),
    ('almond butter', 'cup'), ('nut butter', 'cup'),
    ('salsa', 'cup'), ('tomato sauce', 'cup'), ('puree', 'cup'), ('paste', 'cup'),
    # individual items → count (no unit needed)
    ('egg', ''), ('eggs', ''), ('onion', ''), ('onions', ''),
    ('garlic clove', ''), ('garlic', ''), ('tomato', ''), ('tomatoes', ''),
    ('apple', ''), ('apples', ''), ('banana', ''), ('bananas', ''),
    ('potato', ''), ('potatoes', ''), ('carrot', ''), ('carrots', ''),
    ('bell pepper', ''), ('bell peppers', ''), ('lemon', ''), ('lemons', ''),
    ('lime', ''), ('limes', ''), ('orange', ''), ('oranges', ''),
    ('avocado', ''), ('avocados', ''), ('bell pepper', ''), ('bell peppers', ''),
    ('mushroom', ''), ('mushrooms', ''), ('zucchini', ''), ('zucchinis', ''),
    ('scallion', ''), ('scallions', ''), ('shallot', ''), ('shallots', ''),
    ('turkey', ''), ('chicken breast', ''), ('chicken thigh', ''),
    ('steak', ''), ('patty', ''), ('patties', ''), ('sausage', ''), ('sausages', ''),
    ('bacon', ''), ('slice', ''), ('slices', ''), ('fillet', ''), ('fillets', ''),
    # weight → g
    ('chicken', 'g'), ('beef', 'g'), ('pork', 'g'), ('lamb', 'g'), ('turkey meat', 'g'),
    ('fish', 'g'), ('shrimp', 'g'), ('prawn', 'g'), ('tofu', 'g'), ('tempeh', 'g'),
    ('meat', 'g'), ('ground', 'g'), ('mince', 'g'), ('sirloin', 'g'),
    ('cheese block', 'g'), ('mozzarella', 'cup'), ('parmesan', 'cup'), ('cheddar', 'cup'),
    ('prosciutto', 'g'), ('ham', 'g'), ('roast', 'g'),
    # spices, seasonings → tsp
    ('salt', 'tsp'), ('pepper', 'tsp'), ('cayenne', 'tsp'), ('paprika', 'tsp'),
    ('cinnamon', 'tsp'), ('nutmeg', 'tsp'), ('clove', 'tsp'), ('oregano', 'tsp'),
    ('thyme', 'tsp'), ('rosemary', 'tsp'), ('basil', 'tsp'), ('parsley', 'tsp'),
    ('dill', 'tsp'), ('cumin', 'tsp'), ('turmeric', 'tsp'), ('chili', 'tsp'),
    ('chilli', 'tsp'), ('garlic powder', 'tsp'), ('onion powder', 'tsp'),
    ('ginger', 'tsp'), ('mustard powder', 'tsp'), ('mustard', 'tsp'),
    ('baking powder', 'tsp'), ('baking soda', 'tsp'), ('seasoning', 'tsp'),
    ('curry', 'tsp'), ('herb', 'tsp'), ('spice', 'tsp'), ('allspice', 'tsp'),
    ('chive', 'tsp'),
    ('vanilla extract', 'tsp'), ('almond extract', 'tsp'),
    ('tabasco', 'tsp'), ('hot sauce', 'tsp'),
]


def _has_unit_already(s: str) -> bool:
    """Return True if the measurement string already contains a unit keyword."""
    s_lower = s.lower()
    for kw in _RECOGNIZED_UNITS:
        if kw in s_lower:
            return True
    return False


def _infer_unit(measurement: str, ingredient: str) -> str:
    """Append a sensible unit to a bare-number measurement if it has none."""
    if not measurement or not measurement.strip():
        return measurement
    # If it already has a unit, leave it
    if _has_unit_already(measurement):
        return measurement
    # If it's a garnish/serving label, leave it
    if measurement.strip().lower() in (
        'to serve', 'garnish with', 'topping', 'for garnish', 'for serving',
    ):
        return measurement
    # Try ingredient-based inference (longest keyword first for specificity)
    ing_lower = ingredient.lower()
    for keyword, unit in sorted(_INFERRED_UNITS, key=lambda x: -len(x[0])):
        if keyword in ing_lower:
            if not unit:
                return measurement
            return f'{measurement} {unit}'
    # Fallback: if the number is < 25 treat as count (no unit), else grams
    parsed = _parse_float(measurement)
    if parsed is not None and parsed < 25:
        return measurement
    return f'{measurement} g'


def _fallback_scale(
    ingredients: list[str],
    measurements: list[str],
    original_servings: int | None,
    desired_servings: int,
) -> QuantitiesAdjustment:
    ratio = desired_servings / (original_servings or 4)
    adjusted = []
    for ing, meas in zip(ingredients, measurements):
        scaled = _scale_one(meas, ratio)
        scaled = _sanitize_measurement(scaled)
        scaled = _infer_unit(scaled, ing)
        scaled = _format_measurement(scaled)
        adjusted.append(
            AdjustedIngredient(
                ingredient=ing,
                original_measurement=meas,
                adjusted_measurement=scaled,
                note=None,
            )
        )
    return QuantitiesAdjustment(ingredients=adjusted)
