import logging
import re

from httpx import AsyncClient
from langchain_core.messages import SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from app.recipes.schemas import RecipeQuery, RecipeSearchResult, ValidationResult
from app.recipes.search.mealdb import run_search
from app.shared.config import settings
from app.shared.timing import log_duration

logger = logging.getLogger(__name__)


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
