import logging

from langchain_core.messages import SystemMessage
from langchain_core.prompts import ChatPromptTemplate

from app.recipes.quantity.units import (
    _fallback_scale,
    _format_measurement,
    _infer_unit,
    _sanitize_measurement,
)
from app.recipes.schemas import QuantitiesAdjustment
from app.recipes.search.agent import _get_llm
from app.shared.timing import log_duration

logger = logging.getLogger(__name__)


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

