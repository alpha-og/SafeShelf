import logging
import re

from app.recipes.schemas import AdjustedIngredient, QuantitiesAdjustment

logger = logging.getLogger(__name__)

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
