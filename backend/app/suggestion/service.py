from sqlalchemy.orm import selectinload
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.products.models import Product
from app.stores.models import Store, StoreInventory
from app.suggestion.embeddings import query_similar_products


async def get_product_suggestions(
    barcode: str, session: AsyncSession, n: int = 10, store_id: str | None = None
) -> list[Product]:
    # 1. Fetch current product by barcode
    stmt = (
        select(Product).where(Product.barcode == barcode).options(selectinload(Product.categories))
    )
    res = await session.execute(stmt)
    product = res.scalar_one_or_none()

    if not product:
        return []

    # Use a larger candidate pool to account for brand deduplication filtering
    candidate_limit = n * 5 if store_id else n * 4
    matched_barcodes = await query_similar_products(product, n_results=candidate_limit)

    # Filter out current barcode
    filtered_barcodes = [b for b in matched_barcodes if b != barcode]
    if not store_id:
        filtered_barcodes = filtered_barcodes[:n]

    if not filtered_barcodes:
        return []

    # 3. Fetch the matched products from the database

    stmt_matches = (
        select(Product)
        .where(Product.barcode.in_(filtered_barcodes))
        .options(selectinload(Product.categories))
    )

    if store_id:
        stmt_matches = (
            stmt_matches.join(Product.inventory)
            .join(StoreInventory.store)
            .where(Store.uuid == store_id)
            .where(StoreInventory.stock_quantity > 0)
            .options(selectinload(Product.inventory))
        )

    res_matches = await session.execute(stmt_matches)
    matched_products = res_matches.scalars().all()

    # Map from barcode to product object to preserve ordering
    product_map = {p.barcode: p for p in matched_products}

    scanned_brand = (product.brand or "").strip().lower()
    scanned_name_tokens = set((product.product_name or "").lower().split())

    def _is_same_family(p: Product) -> bool:
        p_brand = (p.brand or "").strip().lower()
        p_name_lower = (p.product_name or "").lower()

        # Same brand string
        if p_brand and scanned_brand and p_brand == scanned_brand:
            return True

        # Scanned brand keyword appears in suggestion's product name
        if scanned_brand:
            for token in scanned_brand.split():
                if len(token) > 3 and token in p_name_lower:
                    return True

        # Suggestion's brand keyword appears in scanned product name
        if p_brand:
            for token in p_brand.split():
                if len(token) > 3 and token in scanned_name_tokens:
                    return True

        return False

    seen_brands: set[str] = set()
    ordered_products = []

    for b in filtered_barcodes:
        if b not in product_map:
            continue

        p = product_map[b]
        p_brand = (p.brand or "").strip().lower()

        # Skip same-family products (brand or name overlap)
        if _is_same_family(p):
            continue

        if p_brand and p_brand in seen_brands:
            continue

        seen_brands.add(p_brand)
        ordered_products.append(p)

        if len(ordered_products) == n:
            break

    return ordered_products



async def embed_all_products_task(session: AsyncSession, batch_size: int = 100) -> int:
    from app.suggestion.embeddings import upsert_products_batch

    offset = 0
    total_embedded = 0

    while True:
        stmt = (
            select(Product)
            .options(selectinload(Product.categories))
            .offset(offset)
            .limit(batch_size)
        )
        res = await session.execute(stmt)
        products = res.scalars().all()

        if not products:
            break

        await upsert_products_batch(products)
        total_embedded += len(products)
        offset += batch_size

    return total_embedded
