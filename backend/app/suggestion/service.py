from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from app.products.models import Product
from app.suggestion.embeddings import query_similar_products, upsert_product_embedding

async def get_product_suggestions(barcode: str, session: AsyncSession, n: int = 5) -> list[Product]:
    # 1. Fetch current product by barcode
    stmt = select(Product).where(Product.barcode == barcode)
    res = await session.execute(stmt)
    product = res.scalar_one_or_none()
    
    if not product:
        return []
    
    # 2. Upsert it into the vector database
    await upsert_product_embedding(product)
    
    # 3. Query similar products (n+1 to exclude current barcode)
    matched_barcodes = await query_similar_products(product, n_results=n + 1)
    
    # Filter out current barcode
    filtered_barcodes = [b for b in matched_barcodes if b != barcode][:n]
    
    if not filtered_barcodes:
        return []
        
    # 4. Fetch the matched products from the database
    stmt_matches = select(Product).where(Product.barcode.in_(filtered_barcodes))
    res_matches = await session.execute(stmt_matches)
    matched_products = res_matches.scalars().all()
    
    # Map from barcode to product object to preserve ordering
    product_map = {p.barcode: p for p in matched_products}
    
    # Return matched products in order
    ordered_products = []
    for b in filtered_barcodes:
        if b in product_map:
            ordered_products.append(product_map[b])
            
    return ordered_products
