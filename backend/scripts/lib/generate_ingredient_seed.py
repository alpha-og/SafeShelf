#!/usr/bin/env python3
"""
Generate ingredient seed data for SafeShelf.

Phases (all-in-one):
  1. Extract top recipe ingredients from the DB
  2. Normalize variants into canonical forms
  3. Query USDA FoodData Central API for nutrition data
  4. Generate multiple product variants per ingredient
  5. Write JSON seed files per category into data/

Usage:
  export USDA_FDC_API_KEY=your_key
  uv run python -m scripts.lib.generate_ingredient_seed
"""

import argparse
import asyncio
import json
import logging
import os
import random
import re
import sys
import time
import uuid
from collections import Counter
from pathlib import Path

import httpx
from sqlmodel import select

from app.recipes.models import Recipe
from app.shared.config import settings
from app.shared.db import async_session

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parents[2] / 'data'
DATA_DIR.mkdir(parents=True, exist_ok=True)

NORMALIZATION_FILE = DATA_DIR / 'ingredient_normalization.json'

DEFAULT_LIMIT = 200
USDA_BASE = 'https://api.nal.usda.gov/fdc/v1'

# ==============================================================
# NORMALIZATION — manual mappings and helpers
# ==============================================================

# Canonical form overrides for specific raw ingredient strings.
# Key: raw ingredient (lowercase, stripped). Value: canonical name.
_NORMALIZE_MAP: dict[str, str] = {
    # Alliums
    'garlic cloves': 'garlic',
    'garlic clove': 'garlic',
    'garlic': 'garlic',
    'chives': 'chives',
    'fresh chives': 'chives',
    'minced chives': 'chives',
    'scallion': 'scallions',
    'scallions': 'scallions',
    'green onion': 'green onions',
    'green onions': 'green onions',
    # Onions
    'onions': 'onions',
    'onion': 'onions',
    'yellow onion': 'onions',
    'white onion': 'onions',
    # Green onions
    'green onion': 'green onions',
    'green onions': 'green onions',
    # Red onion — keep separate
    'red onion': 'red onion',
    # Eggs
    'egg': 'eggs',
    'eggs': 'eggs',
    # Sugar
    'sugar': 'white sugar',
    'white sugar': 'white sugar',
    'granulated sugar': 'white sugar',
    # Brown sugar
    'brown sugar': 'brown sugar',
    'light brown sugar': 'brown sugar',
    'dark brown sugar': 'brown sugar',
    # Powdered sugar
    'powdered sugar': 'powdered sugar',
    "confectioners' sugar": 'powdered sugar',
    # Flour
    'flour': 'all-purpose flour',
    'all-purpose flour': 'all-purpose flour',
    'plain flour': 'all-purpose flour',
    'whole wheat flour': 'whole wheat flour',
    # Butter
    'butter': 'butter',
    'unsalted butter': 'butter',
    'salted butter': 'butter',
    # Milk
    'milk': 'milk',
    'whole milk': 'milk',
    # Pepper
    'pepper': 'black pepper',
    'black pepper': 'black pepper',
    'fresh ground black pepper': 'black pepper',
    'ground black pepper': 'black pepper',
    'fresh ground pepper': 'black pepper',
    # Salt
    'salt': 'salt',
    'kosher salt': 'salt',
    'sea salt': 'salt',
    'table salt': 'salt',
    'seasoning salt': 'salt',
    # Olive oil
    'olive oil': 'olive oil',
    'extra virgin olive oil': 'olive oil',
    'extra-virgin olive oil': 'olive oil',
    # Carrot
    'carrot': 'carrots',
    'carrots': 'carrots',
    # Potato
    'potato': 'potatoes',
    'potatoes': 'potatoes',
    # Tomato
    'tomato': 'tomatoes',
    'tomatoes': 'tomatoes',
    # Mushroom
    'mushroom': 'mushrooms',
    'mushrooms': 'mushrooms',
    'fresh mushrooms': 'mushrooms',
    # Celery
    'celery': 'celery',
    # Garlic powder
    'garlic powder': 'garlic powder',
    # Onion powder
    'onion powder': 'onion powder',
    # Cinnamon
    'cinnamon': 'cinnamon',
    'ground cinnamon': 'cinnamon',
    # Cumin
    'cumin': 'cumin',
    'ground cumin': 'cumin',
    # Paprika
    'paprika': 'paprika',
    # Chili powder
    'chili powder': 'chili powder',
    'chilli powder': 'chili powder',
    # Cayenne
    'cayenne': 'cayenne pepper',
    'cayenne pepper': 'cayenne pepper',
    # Oregano
    'oregano': 'oregano',
    'dried oregano': 'oregano',
    # Basil
    'basil': 'basil',
    'dried basil': 'basil',
    'fresh basil': 'basil',
    # Parsley
    'parsley': 'parsley',
    'fresh parsley': 'parsley',
    # Cilantro
    'cilantro': 'cilantro',
    'fresh cilantro': 'cilantro',
    # Thyme
    'thyme': 'thyme',
    'fresh thyme': 'thyme',
    'dried thyme': 'thyme',
    # Ginger
    'ginger': 'ginger',
    'fresh ginger': 'ginger',
    'gingerroot': 'ginger',
    'ginger root': 'ginger',
    'ground ginger': 'ginger',
    # Nutmeg
    'nutmeg': 'nutmeg',
    'ground nutmeg': 'nutmeg',
    # Bay leaf
    'bay leaf': 'bay leaves',
    'bay leaves': 'bay leaves',
    # Curry powder
    'curry powder': 'curry powder',
    # Chicken
    'chicken breasts': 'chicken breast',
    'chicken breast': 'chicken breast',
    'boneless skinless chicken breasts': 'chicken breast',
    'boneless skinless chicken breast halves': 'chicken breast',
    'boneless skinless chicken breast': 'chicken breast',
    # Beef
    'ground beef': 'ground beef',
    # Bacon
    'bacon': 'bacon',
    # Vanilla
    'vanilla': 'vanilla extract',
    'vanilla extract': 'vanilla extract',
    # Lemon
    'lemon': 'lemon',
    'lemons': 'lemon',
    'lemon juice': 'lemon juice',
    'fresh lemon juice': 'lemon juice',
    # Lime
    'lime': 'lime',
    'lime juice': 'lime juice',
    'fresh lime juice': 'lime juice',
    # Banana
    'banana': 'bananas',
    'bananas': 'bananas',
    # Cheese — keep varieties separate
    'parmesan cheese': 'parmesan cheese',
    'mozzarella cheese': 'mozzarella cheese',
    'cheddar cheese': 'cheddar cheese',
    'sharp cheddar cheese': 'cheddar cheese',
    'cream cheese': 'cream cheese',
    'feta cheese': 'feta cheese',
    'swiss cheese': 'swiss cheese',
    'monterey jack cheese': 'monterey jack cheese',
    'cheese': 'cheddar cheese',  # generic → most common
    # Dairy
    'sour cream': 'sour cream',
    'heavy cream': 'heavy cream',
    'half-and-half': 'half and half',
    'buttermilk': 'buttermilk',
    'yogurt': 'yogurt',
    'plain yogurt': 'yogurt',
    'margarine': 'margarine',
    'shortening': 'shortening',
    # Vinegars
    'vinegar': 'white vinegar',
    'white vinegar': 'white vinegar',
    'cider vinegar': 'apple cider vinegar',
    'red wine vinegar': 'red wine vinegar',
    'white wine vinegar': 'white wine vinegar',
    'balsamic vinegar': 'balsamic vinegar',
    # Oils
    'canola oil': 'canola oil',
    'vegetable oil': 'vegetable oil',
    'coconut oil': 'coconut oil',
    # Condiments
    'soy sauce': 'soy sauce',
    'worcestershire sauce': 'worcestershire sauce',
    'ketchup': 'ketchup',
    'mayonnaise': 'mayonnaise',
    'dijon mustard': 'dijon mustard',
    'yellow mustard': 'yellow mustard',
    'mustard': 'yellow mustard',
    'salsa': 'salsa',
    'hot sauce': 'hot sauce',
    'tabasco sauce': 'hot sauce',
    # Canned
    'tomato paste': 'tomato paste',
    'tomato sauce': 'tomato sauce',
    'diced tomatoes': 'diced tomatoes',
    'chicken broth': 'chicken broth',
    'beef broth': 'beef broth',
    'black beans': 'black beans',
    'red kidney beans': 'kidney beans',
    'kidney beans': 'kidney beans',
    'chickpeas': 'chickpeas',
    # Baking
    'baking powder': 'baking powder',
    'baking soda': 'baking soda',
    'cornstarch': 'cornstarch',
    'honey': 'honey',
    'pecans': 'pecans',
    'walnuts': 'walnuts',
    'raisins': 'raisins',
    'peanut butter': 'peanut butter',
    'chocolate chips': 'chocolate chips',
    'cocoa powder': 'cocoa powder',
    'sesame seeds': 'sesame seeds',
    # Grains
    'rice': 'white rice',
    'white rice': 'white rice',
    'brown rice': 'brown rice',
    'pasta': 'pasta',
    # Produce
    'zucchini': 'zucchini',
    'cucumber': 'cucumber',
    'cabbage': 'cabbage',
    'broccoli': 'broccoli',
    'cauliflower': 'cauliflower',
    'spinach': 'spinach',
    'bell pepper': 'bell pepper',
    'red bell pepper': 'red bell pepper',
    'green bell pepper': 'green bell pepper',
    'shallot': 'shallot',
    'green beans': 'green beans',
    # Seafood — singular to plural
    'shrimp': 'shrimp',
    'tuna': 'tuna',
    'salmon': 'salmon',
    # Fruits (for completeness)
    'blueberries': 'blueberries',
    'strawberries': 'strawberries',
    'raspberries': 'raspberries',
    'avocado': 'avocado',
    'pineapple': 'pineapple',
    'watermelon': 'watermelon',
    # Nuts
    'almonds': 'almonds',
    'cashews': 'cashews',
    'peanuts': 'peanuts',
    # Meat
    'pork chops': 'pork chops',
    'pork': 'pork',
    'sausage': 'sausage',
    'turkey': 'turkey',
    # Alcohol (for cooking)
    'dry white wine': 'dry white wine',
    'red wine': 'red wine',
    'cooking wine': 'cooking wine',
    # Regional Kerala
    'coconut milk': 'coconut milk',
    'curry leaves': 'curry leaves',
    'mustard seeds': 'mustard seeds',
    'tamarind': 'tamarind',
    'asafoetida': 'asafoetida',
    'hing': 'asafoetida',
    'coconut': 'coconut',
    'ghee': 'ghee',
    'turmeric': 'turmeric',
    'ground turmeric': 'turmeric',
    'red chili powder': 'red chili powder',
    'dried red chilies': 'dried red chilies',
    'garam masala': 'garam masala',
    'cardamom': 'cardamom',
    'cloves': 'cloves',
    'fennel seeds': 'fennel seeds',
    'coriander powder': 'coriander powder',
    'coriander': 'coriander',
    'cumin seeds': 'cumin seeds',
    'fenugreek': 'fenugreek',
    'kasuri methi': 'fenugreek',
}

# Ingredients to skip (not a product, or too vague)
_SKIP: set[str] = {
    'water', 'hot water', 'cold water', 'boiling water', 'warm water',
    'ice', 'ice cubes', 'ice water',
    'salt and pepper', 'salt & pepper',
}

_STOP_PATTERNS = [
    re.compile(r'\b(fresh|organic|natural|pure|raw)\b'),
]


def _normalize_ingredient(raw: str) -> str | None:
    raw_lower = raw.strip().lower()
    # Remove parenthetical notes like "(to taste)", "(optional)"
    raw_clean = re.sub(r'\([^)]*\)', '', raw_lower).strip()
    raw_clean = re.sub(r'\s+', ' ', raw_clean)

    if not raw_clean or raw_clean in _SKIP:
        return None

    if raw_clean in _NORMALIZE_MAP:
        return _NORMALIZE_MAP[raw_clean]

    # Strip leading stop phrases
    for pat in _STOP_PATTERNS:
        raw_clean = pat.sub('', raw_clean).strip()

    # Plural/singular normalization (conservative — just stripping common plural forms)
    words = raw_clean.split()
    normalized_words = []
    for w in words:
        if w in ('a', 'an', 'the', 'some'):
            continue
        if w.endswith('ies') and len(w) > 4:
            normalized_words.append(w[:-3] + 'y')
            continue
        if w.endswith('ches') or w.endswith('shes') or w.endswith('xes') or w.endswith('zes'):
            normalized_words.append(w[:-2])
            continue
        if w.endswith('oes') and len(w) > 4:
            normalized_words.append(w[:-2])
            continue
        if w.endswith('es') and len(w) > 4:
            normalized_words.append(w[:-1])
            continue
        if w.endswith('s') and not w.endswith('ss') and len(w) > 3:
            normalized_words.append(w[:-1])
            continue
        normalized_words.append(w)

    canonical = ' '.join(normalized_words)
    if canonical in _NORMALIZE_MAP:
        return _NORMALIZE_MAP[canonical]

    # Fallback: return the cleaned version
    return canonical if canonical else None


# ==============================================================
# CATEGORY ASSIGNMENT
# ==============================================================

_CATEGORY_RULES: list[tuple[re.Pattern, str]] = [
    (re.compile(r'cheese|sour cream|heavy cream|half and half|buttermilk|yogurt|margarine'), 'Dairy'),
    (re.compile(r'milk|butter|eggs?$'), 'Dairy'),
    (re.compile(r'chicken|beef|bacon|pork|sausage|turkey|ground beef|steak|ham|lamb'), 'Meats'),
    (re.compile(r'shrimp|tuna|salmon|cod|tilapia|fish|seafood|crab|lobster'), 'Meats'),
    (re.compile(r'salt|pepper|sugar|flour|baking (powder|soda)|cornstarch|honey|vanilla'), 'Pantry Staples'),
    (re.compile(r'chocolate chips|cocoa powder|peanut butter|raisins|pecans|walnuts|almonds|cashews|peanuts'), 'Pantry Staples'),
    (re.compile(r'cinnamon|cumin|paprika|oregano|basil|parsley|cilantro|thyme|nutmeg|ginger|turmeric|curry powder|garam masala|cardamom|cloves|fennel|coriander|fenugreek'), 'Herbs & Spices'),
    (re.compile(r'bay leaves?|chili powder|cayenne|red pepper flakes|garlic powder|onion powder|mustard seeds?'), 'Herbs & Spices'),
    (re.compile(r'olive oil|canola oil|vegetable oil|coconut oil|sesame oil|soy sauce|worcestershire|ketchup|mayonnaise|mustard|salsa|hot sauce|vinegar'), 'Oils & Condiments'),
    (re.compile(r'tomato paste|tomato sauce|diced tomatoes|chicken broth|beef broth|black beans|kidney beans|chickpeas|canned'), 'Canned Foods'),
    (re.compile(r'rice|pasta|noodles?|bread|oats|cereal|quinoa|couscous'), 'Grains & Baking'),
    (re.compile(r'coconut milk|curry leaves|tamarind|asafoetida|hing|ghee|dried red chilies?|red chili powder'), 'Regional Kerala'),
    (re.compile(r'onions?|garlic|celery|carrots?|potatoes?|tomatoes?|mushrooms?|zucchini|cucumber|cabbage|broccoli|cauliflower|spinach|bell pepper|shallot|green beans|lettuce|kale|eggplant|corn'), 'Vegetables'),
    (re.compile(r'lemon|lime|bananas?|blueberries|strawberries|raspberries|avocado|pineapple|watermelon'), 'Fruits'),
    (re.compile(r'pecans|walnuts|almonds|cashews|peanuts|mixed nuts'), 'Pantry Staples'),
]

# New categories the generated script introduces (non-OFF categories)
NEW_CATEGORIES = {
    'Pantry Staples': '',
    'Herbs & Spices': '',
    'Oils & Condiments': '',
    'Regional Kerala': '',
    'Grains & Baking': '',
}

# Combined categories for use in seed.py
ALL_CATEGORIES = {
    'Beverages': 'beverages',
    'Snacks': 'snacks',
    'Dairy': 'dairies',
    'Bakery': 'breads',
    'Meats': 'meats',
    'Fruits': 'fruits',
    'Vegetables': 'vegetables',
    'Cereals': 'cereals',
    'Sauces': 'sauces',
    'Confectioneries': 'confectioneries',
    'Frozen Foods': 'frozen-foods',
    'Canned Foods': 'canned-foods',
    'Desserts': 'desserts',
    'Spices': 'spices',
    'Pasta': 'pastas',
    'Pantry Staples': '',
    'Herbs & Spices': '',
    'Oils & Condiments': '',
    'Regional Kerala': '',
    'Grains & Baking': '',
}


def _assign_category(canonical: str) -> str:
    for pattern, cat in _CATEGORY_RULES:
        if pattern.search(canonical):
            return cat
    return 'Pantry Staples'  # default


# ==============================================================
# VARIANT GENERATION — templates per category
# ==============================================================

BrandPool = list[str]

BRAND_POOLS: dict[str, BrandPool] = {
    'Dairy': ['Amul', 'Mother Dairy', 'Milma', 'Nandini', 'SafeShelf Fresh'],
    'Meats': ['SafeShelf Fresh', 'Fresh Farm'],
    'Vegetables': ['Fresh Farm Produce'],
    'Fruits': ['Fresh Farm Produce'],
    'Herbs & Spices': ['Everest', 'MDH', 'Catch', 'SafeShelf'],
    'Oils & Condiments': ['Fortune', 'Saffola', 'Dhara', 'SafeShelf'],
    'Pantry Staples': ['SafeShelf', 'Tata', 'Deep', 'Shakti Bhog'],
    'Canned Foods': ['SafeShelf', 'Heinz'],
    'Grains & Baking': ['SafeShelf', 'Tata', 'Pillsbury'],
    'Regional Kerala': ['SafeShelf', 'Kerala Spices'],
}

CATEGORY_IMAGE_MAP: dict[str, str] = {
    'Dairy': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&q=80',
    'Meats': 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=500&q=80',
    'Herbs & Spices': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&q=80',
    'Oils & Condiments': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&q=80',
    'Pantry Staples': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&q=80',
    'Canned Foods': 'https://images.unsplash.com/photo-1584269600464-37b1b58e9e91?w=500&q=80',
    'Grains & Baking': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80',
    'Regional Kerala': 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500&q=80',
    'Vegetables': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80',
    'Fruits': 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=500&q=80',
}

CATEGORY_PRICE_RANGES: dict[str, tuple[float, float]] = {
    'Dairy': (25, 400),
    'Meats': (80, 800),
    'Herbs & Spices': (20, 150),
    'Oils & Condiments': (40, 350),
    'Pantry Staples': (20, 300),
    'Canned Foods': (25, 200),
    'Grains & Baking': (25, 300),
    'Regional Kerala': (20, 250),
    'Vegetables': (15, 120),
    'Fruits': (20, 200),
}

# Specific quantity overrides for certain ingredients
INGREDIENT_QUANTITIES: dict[str, str] = {
    'milk': '1 L',
    'eggs': '6 pcs',
    'butter': '500 g',
    'whole wheat flour': '1 kg',
    'all-purpose flour': '1 kg',
    'white sugar': '1 kg',
    'brown sugar': '500 g',
    'powdered sugar': '500 g',
    'baking soda': '100 g',
    'baking powder': '100 g',
    'cornstarch': '200 g',
    'vanilla extract': '100 ml',
    'honey': '500 g',
    'peanut butter': '500 g',
    'chocolate chips': '200 g',
    'cocoa powder': '200 g',
    'olive oil': '1 L',
    'canola oil': '1 L',
    'vegetable oil': '1 L',
    'coconut oil': '500 ml',
    'soy sauce': '500 ml',
    'worcestershire sauce': '300 ml',
    'ketchup': '500 g',
    'mayonnaise': '500 g',
    'yellow mustard': '200 g',
    'dijon mustard': '200 g',
    'salsa': '400 g',
    'hot sauce': '150 ml',
    'white vinegar': '500 ml',
    'apple cider vinegar': '500 ml',
    'red wine vinegar': '500 ml',
    'balsamic vinegar': '250 ml',
    'chicken broth': '1 L',
    'beef broth': '1 L',
    'black beans': '400 g',
    'kidney beans': '400 g',
    'chickpeas': '400 g',
    'tomato paste': '200 g',
    'tomato sauce': '400 g',
    'diced tomatoes': '400 g',
    'white rice': '1 kg',
    'brown rice': '1 kg',
    'pasta': '500 g',
    'sesame seeds': '100 g',
    'pecans': '200 g',
    'walnuts': '200 g',
    'almonds': '200 g',
    'cashews': '200 g',
    'peanuts': '200 g',
    'raisins': '200 g',
    'coconut milk': '400 ml',
    'ghee': '500 ml',
    'turmeric': '100 g',
    'cinnamon': '100 g',
    'cumin': '100 g',
    'paprika': '100 g',
    'chili powder': '100 g',
    'curry powder': '100 g',
    'garam masala': '100 g',
    'garlic powder': '100 g',
    'onion powder': '100 g',
    'oregano': '50 g',
    'basil': '50 g',
    'thyme': '50 g',
    'parsley': '50 g',
    'cilantro': '50 g',
    'ginger': '200 g',
    'bay leaves': '30 g',
    'red pepper flakes': '50 g',
    'nutmeg': '50 g',
    'coriander': '100 g',
    'mustard seeds': '100 g',
    'fennel seeds': '100 g',
    'cardamom': '50 g',
    'cloves': '50 g',
    'fenugreek': '100 g',
    'dried red chilies': '100 g',
}

# Ingredients that get an organic/quality variant
_PREMIUM_INGREDIENTS: set[str] = {
    'olive oil', 'honey', 'butter', 'milk', 'eggs', 'chicken breast',
}


def _generate_variants(canonical: str, category: str, usda_nutrients: dict) -> list[dict]:
    random.seed(canonical)

    variants: list[dict] = []
    brands = BRAND_POOLS.get(category, ['SafeShelf'])
    price_min, price_max = CATEGORY_PRICE_RANGES.get(category, (20, 100))
    quantity = INGREDIENT_QUANTITIES.get(canonical, '500 g')

    base_name = canonical.replace('-', ' ').title()
    # Normalize "And" → "and", but keep others uppercase
    base_name = base_name.replace('And', 'and').replace('Or', 'or')

    # Determine variant count: 2-4 per ingredient
    num_variants = min(len(brands), random.randint(2, 4))

    for i in range(num_variants):
        brand = brands[i] if i < len(brands) else brands[-1]

        if brand == 'SafeShelf' or brand == 'SafeShelf Fresh':
            prod_name = f'{base_name}'
        elif brand in ('Fresh Farm Produce', 'Fresh Farm'):
            prod_name = f'Fresh {base_name}'
        else:
            prod_name = f'{brand} {base_name}'

        # Premium/organic variant
        if i == num_variants - 1 and canonical in _PREMIUM_INGREDIENTS:
            prod_name = f'Organic {base_name}'
            brand = 'Organic Farms'
            price = round(random.uniform(price_min * 1.3, price_max * 1.5), 2)
        else:
            price = round(random.uniform(price_min, price_max), 2)

        barcode = f'PROD-{category.upper().replace(" & ", "-").replace(" ", "-")}-{canonical.upper().replace(" ", "-")}-{str(i).zfill(2)}'

        variants.append({
            'barcode': barcode,
            'product_name': prod_name,
            'category': category,
            'image_url': CATEGORY_IMAGE_MAP.get(category),
            'quantity': quantity,
            'brand': brand,
            'nutrients': dict(usda_nutrients),  # same nutrients for all variants of same ingredient
        })

    return variants


# ==============================================================
# USDA API
# ==============================================================

USDA_NUTRIENT_MAP = {
    1008: 'energy-kcal_100g',
    1003: 'proteins_100g',
    1004: 'fat_100g',
    1005: 'carbohydrates_100g',
    1079: 'fiber_100g',
    2000: 'sugars_100g',
    1093: 'sodium_100g',
}


async def _query_usda_food(canonical: str, api_key: str) -> dict | None:
    """Query USDA FDC API for the best matching food item."""
    query = canonical.replace('-', ' ')
    url = f'{USDA_BASE}/foods/search'
    params = {
        'query': query,
        'dataType': 'Foundation,SR Legacy',
        'pageSize': 1,
        'api_key': api_key,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code != 200:
                logger.warning(f'USDA API error {resp.status_code} for "{query}"')
                return None
            data = resp.json()
            foods = data.get('foods', [])
            if not foods:
                logger.debug(f'No USDA result for "{query}"')
                return None

            food = foods[0]
            nutrients = {}
            for n in food.get('foodNutrients', []):
                nutrient_id = n.get('nutrientId')
                if nutrient_id in USDA_NUTRIENT_MAP:
                    key = USDA_NUTRIENT_MAP[nutrient_id]
                    value = n.get('value')
                    if value is not None:
                        nutrients[key] = round(value, 2)

            # sodium is in mg in USDA, convert to g for our format
            if 'sodium_100g' in nutrients:
                nutrients['sodium_100g'] = round(nutrients['sodium_100g'] / 1000, 4)

            return nutrients
    except httpx.TimeoutException:
        logger.warning(f'USDA timeout for "{query}"')
    except Exception as e:
        logger.warning(f'USDA error for "{query}": {e}')
    return None


async def _enrich_nutrients(
    canonical_groups: dict[str, list[str]],
    api_key: str,
) -> dict[str, dict]:
    """Query USDA for each canonical ingredient, return nutrient dicts."""
    nutrients: dict[str, dict] = {}
    for i, canonical in enumerate(canonical_groups):
        result = await _query_usda_food(canonical, api_key)
        if result:
            nutrients[canonical] = result
            logger.info(f'  [{i+1}/{len(canonical_groups)}] {canonical} ← USDA OK')
        else:
            nutrients[canonical] = {}
            logger.info(f'  [{i+1}/{len(canonical_groups)}] {canonical} ← NO USDA DATA')
        await asyncio.sleep(0.5)  # rate limit: ~2 req/s
    return nutrients


# ==============================================================
# PHASE 1: Extract from DB
# ==============================================================

async def _extract_ingredients(sample_count: int = 5000) -> Counter:
    """Query a sample of recipes and count ingredient frequencies."""
    logger.info(f'Extracting ingredients from {sample_count} recipes...')
    async with async_session() as session:
        total = (await session.exec(select(Recipe.id))).all()
        total_recipes = len(total)
        logger.info(f'Total recipes in DB: {total_recipes}')

        counter = Counter()
        batch_size = 1000
        processed = 0

        while processed < min(total_recipes, sample_count):
            stmt = (
                select(Recipe.ingredients)
                .offset(processed)
                .limit(batch_size)
            )
            batch = (await session.exec(stmt)).all()
            for ings in batch:
                if ings:
                    for ing in ings:
                        raw = ing.strip().lower()
                        if raw:
                            counter[raw] += 1
            processed += batch_size
            logger.info(f'  Processed {processed} recipes...')

    logger.info(f'Found {len(counter)} unique ingredient strings')
    return counter


# ==============================================================
# PHASE 2: Normalize
# ==============================================================

def _build_normalization(
    counter: Counter,
    top_n: int = 200,
) -> tuple[dict[str, str], dict[str, list[str]]]:
    """Build raw→canonical mapping from ingredient frequency data."""
    top_ingredients = counter.most_common(top_n)
    mapping: dict[str, str] = {}
    canonical_groups: dict[str, list[str]] = {}

    for raw, count in top_ingredients[:10]:
        logger.info(f'  ({count:5d}) {raw}')

    for raw, _ in top_ingredients:
        canonical = _normalize_ingredient(raw)
        if canonical is None:
            continue
        mapping[raw] = canonical
        if canonical not in canonical_groups:
            canonical_groups[canonical] = []
        canonical_groups[canonical].append(raw)

    logger.info(f'\nNormalized {len(mapping)} ingredients into {len(canonical_groups)} canonical groups')
    logger.info('\n=== Canonical groups (size > 1) ===')
    for canonical, raws in sorted(canonical_groups.items(), key=lambda x: -len(x[1])):
        if len(raws) > 1:
            logger.info(f'  {canonical} ({len(raws)}): {", ".join(raws[:5])}')
            if len(raws) > 5:
                logger.info(f'    + {len(raws) - 5} more')

    return mapping, canonical_groups


# ==============================================================
# PHASE 3-5: USDA → Generate → Write
# ==============================================================

def _generate_seed_data(
    canonical_groups: dict[str, list[str]],
    nutrients: dict[str, dict],
) -> dict[str, list[dict]]:
    """Generate product entries grouped by category."""
    category_products: dict[str, list[dict]] = {}

    for canonical in canonical_groups:
        cat = _assign_category(canonical)
        ing_nutrients = nutrients.get(canonical, {})
        variants = _generate_variants(canonical, cat, ing_nutrients)

        if cat not in category_products:
            category_products[cat] = []
        category_products[cat].extend(variants)

    return category_products


def _write_seed_files(category_products: dict[str, list[dict]]):
    """Write JSON files per category to data/."""
    for cat, products in sorted(category_products.items()):
        file_name = cat.lower().replace(' & ', '_').replace(' ', '_') + '.json'
        file_path = DATA_DIR / file_name
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(products, f, indent=2, ensure_ascii=False)
        logger.info(f'  {file_name}: {len(products)} products')

    # Write a combined summary
    total = sum(len(prods) for prods in category_products.values())
    summary = {
        'source': 'recipe-frequency + USDA FoodData Central',
        'total_products': total,
        'categories': {cat: len(prods) for cat, prods in sorted(category_products.items())},
    }
    summary_path = DATA_DIR / 'ingredient_seed_summary.json'
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2)
    logger.info(f'\nTotal: {total} products across {len(category_products)} categories')
    logger.info(f'Summary: {summary_path}')


# ==============================================================
# MAIN
# ==============================================================

async def run_generate(
    top_n: int = DEFAULT_LIMIT,
    skip_usda: bool = False,
    dry_run: bool = False,
):
    """Run the full pipeline."""
    logger.info('=' * 60)
    logger.info('SafeShelf Ingredient Seed Generator')
    logger.info('=' * 60)

    # Phase 1: Extract
    logger.info('\n📊 Phase 1: Extracting ingredients from recipes...')
    counter = await _extract_ingredients(sample_count=5000)

    # Phase 2: Normalize
    logger.info('\n🔤 Phase 2: Normalizing ingredients...')
    raw_to_canonical, canonical_groups = _build_normalization(counter, top_n=top_n)

    # Save normalization mapping for user review
    norm_path = DATA_DIR / 'ingredient_normalization.json'
    with open(norm_path, 'w', encoding='utf-8') as f:
        json.dump({
            'note': 'Edit this file to fix incorrect groupings, then re-run. Keys are raw ingredients, values are canonical names.',
            'mapping': raw_to_canonical,
        }, f, indent=2, ensure_ascii=False)
    logger.info(f'\nNormalization mapping saved to {norm_path}')
    logger.info('  → Edit this file to fix incorrect groupings and re-run')

    if dry_run:
        logger.info('\n🔍 Dry run — stopping before USDA query and file generation')
        return

    # Phase 3: USDA
    api_key = settings.USDA_FDC_API_KEY
    nutrients: dict[str, dict] = {}
    if skip_usda or not api_key:
        if not api_key:
            logger.warning('\n⚠️  USDA_FDC_API_KEY not set. Skipping USDA nutrition lookup.')
            logger.warning('   Set USDA_FDC_API_KEY in your .env or .env.local for nutrition data.')
            logger.warning('   Sign up: https://fdc.nal.usda.gov/api-key-signup.html')
        else:
            logger.info('\n⏭️  Skipping USDA (--skip-usda)')
    else:
        logger.info(f'\n🌐 Phase 3: Querying USDA FoodData Central ({len(canonical_groups)} items)...')
        nutrients = await _enrich_nutrients(canonical_groups, api_key)
        usda_hits = sum(1 for v in nutrients.values() if v)
        logger.info(f'  USDA results: {usda_hits}/{len(canonical_groups)}')

    # Phase 4: Generate variants
    logger.info('\n🏭 Phase 4: Generating product variants...')
    category_products = _generate_seed_data(canonical_groups, nutrients)
    for cat, products in sorted(category_products.items()):
        logger.info(f'  {cat}: {len(products)} products')

    # Phase 5: Write files
    logger.info(f'\n💾 Phase 5: Writing seed files to {DATA_DIR}/')
    _write_seed_files(category_products)

    logger.info('\n✅ Done!')


def main():
    parser = argparse.ArgumentParser(description='Generate ingredient seed data')
    parser.add_argument('--top-n', type=int, default=DEFAULT_LIMIT,
                        help=f'Number of top ingredients to process (default: {DEFAULT_LIMIT})')
    parser.add_argument('--skip-usda', action='store_true',
                        help='Skip USDA API lookup (use empty nutrients)')
    parser.add_argument('--dry-run', action='store_true',
                        help='Extract + normalize only, do not write seed files')
    args = parser.parse_args()

    asyncio.run(run_generate(
        top_n=args.top_n,
        skip_usda=args.skip_usda,
        dry_run=args.dry_run,
    ))


if __name__ == '__main__':
    main()
