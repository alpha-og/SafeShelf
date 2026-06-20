from sqlalchemy.orm import selectinload
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.products.models import Product
from app.stores.models import Store, StoreInventory
from app.suggestion.embeddings import query_similar_products


async def get_product_suggestions(
    barcode: str, session: AsyncSession, n: int = 5, store_id: str | None = None
) -> list[Product]:
    # 1. Fetch current product by barcode
    stmt = (
        select(Product)
        .where(Product.barcode == barcode)
        .options(selectinload(Product.categories))
    )
    res = await session.execute(stmt)
    product = res.scalar_one_or_none()

    if not product:
        return []

    # 2. Query similar products (using a larger candidate pool if filtering by store_id)
    candidate_limit = n * 4 if store_id else n + 1
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
            stmt_matches
            .join(StoreInventory)
            .join(Store)
            .where(Store.uuid == store_id)
            .where(StoreInventory.stock_quantity > 0)
        )

    res_matches = await session.execute(stmt_matches)
    matched_products = res_matches.scalars().all()

    # Map from barcode to product object to preserve ordering
    product_map = {p.barcode: p for p in matched_products}

    # Return matched products in order, up to n
    ordered_products = []
    for b in filtered_barcodes:
        if b in product_map:
            ordered_products.append(product_map[b])
            if len(ordered_products) == n:
                break

    return ordered_products

async def embed_all_products_task(session: AsyncSession) -> int:
    from app.suggestion.embeddings import upsert_products_batch
    stmt = select(Product).options(selectinload(Product.categories))
    res = await session.execute(stmt)
    products = res.scalars().all()

    if not products:
        return 0

    await upsert_products_batch(products)
    return len(products)
