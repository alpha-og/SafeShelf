import logging
import re

from sqlalchemy import and_, or_
from sqlmodel import select

from app.products.models import Product
from app.stores.models import Store, StoreInventory

logger = logging.getLogger(__name__)

_STOPWORDS: set[str] = {
    'and', 'or', 'with', 'for', 'the', 'a', 'an', 'in', 'of', 'to',
    'fresh', 'organic', 'natural', 'pure',
}

_TOKEN_RE = re.compile(r'[a-z]+')


def _stem(word: str) -> str:
    if len(word) <= 3:
        return word
    w = word
    if w.endswith('ies') and len(w) > 4:
        return w[:-3] + 'y'
    if w.endswith('ves') and len(w) > 4:
        return w[:-3] + 'f'
    if w.endswith('ches') or w.endswith('shes') or w.endswith('xes') or w.endswith('zoes'):
        return w[:-2]
    if w.endswith('oes') and len(w) > 4:
        return w[:-2]
    if w.endswith('es') and len(w) > 4:
        return w[:-1]
    if w.endswith('s') and not w.endswith('ss') and len(w) > 3:
        return w[:-1]
    if w.endswith('ied') and len(w) > 4:
        return w[:-3] + 'y'
    if w.endswith('ing') and len(w) > 5:
        base = w[:-3]
        if len(base) >= 2 and base[-1] == base[-2]:
            return base[:-1]
        return base
    if w.endswith('ed') and len(w) > 4:
        return w[:-2]
    if w.endswith('ly') and len(w) > 4:
        return w[:-2]
    return w


def _tokenize(text: str) -> list[str]:
    tokens = _TOKEN_RE.findall(text.lower())
    return [t for t in tokens if t not in _STOPWORDS and len(t) > 1]


def _has_word(name: str, word: str) -> bool:
    return bool(re.search(rf'(?<![a-z]){re.escape(word)}(?![a-z])', name))


async def match_ingredient(
    session,
    ingredient: str,
    store_id: str,
) -> list[dict]:
    tokens = _tokenize(ingredient)
    if not tokens:
        return []

    token_conditions = []
    for t in tokens:
        variants = {t}
        stemmed = _stem(t)
        if stemmed != t:
            variants.add(stemmed)
        variant_conds = [
            Product.product_name.ilike(f'%{v}%')  # type: ignore[attr-defined]
            for v in variants
        ]
        token_conditions.append(or_(*variant_conds))

    stmt = (
        select(StoreInventory, Product)
        .join(Product, StoreInventory.product_id == Product.id)  # type: ignore[arg-type]
        .join(Store, StoreInventory.store_id == Store.id)  # type: ignore[arg-type]
        .where(Store.uuid == store_id)
        .where(StoreInventory.stock_quantity > 0)
        .where(and_(*token_conditions))
    )

    stmt = stmt.order_by(StoreInventory.price).limit(20)

    result = await session.execute(stmt)
    rows = result.all()

    seen: set[str] = set()
    results: list[dict] = []
    for inv, prod in rows:
        name_lower = prod.product_name.lower()
        if name_lower in seen:
            continue
        seen.add(name_lower)
        if not all(_has_word(name_lower, t) for t in tokens):
            continue
        results.append({
            'barcode': prod.barcode,
            'product_name': prod.product_name,
            'product_image': prod.product_image,
            'brand': prod.brand,
            'quantity': prod.quantity,
            'price': inv.price,
            'in_stock': inv.stock_quantity > 0,
        })

    return results


async def match_ingredients(
    session,
    ingredients: list[str],
    store_id: str,
) -> list[dict]:
    return [
        {
            'ingredient': ing,
            'options': await match_ingredient(session, ing, store_id),
        }
        for ing in ingredients
    ]
