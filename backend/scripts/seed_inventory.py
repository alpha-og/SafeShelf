import asyncio
import httpx
import random
import uuid
from sqlmodel import SQLModel, select
from app.shared.db import engine, async_session
from app.stores.models import StoreInventory, Store
from app.products.models import Product, Category, ProductCategory

# Curated categories with their OpenFoodFacts tags
CATEGORIES = {
    "Beverages": "beverages",
    "Snacks": "snacks",
    "Dairy": "dairies",
    "Bakery": "breads",
    "Meats": "meats",
    "Fruits": "fruits",
    "Vegetables": "vegetables",
    "Cereals": "cereals",
    "Sauces": "sauces",
    "Confectioneries": "confectioneries",
    "Frozen Foods": "frozen-foods",
    "Canned Foods": "canned-foods",
    "Desserts": "desserts",
    "Spices": "spices",
    "Pasta": "pastas"
}

PRODUCTS_PER_CATEGORY = 30

async def fetch_off_products(category_tag: str, limit: int = 30) -> list[dict]:
    url = f"https://world.openfoodfacts.org/api/v2/search?categories_tags={category_tag}&countries_tags=india&fields=code,product_name,image_url,brands,quantity&page_size={limit}"
    headers = {"User-Agent": "SafeShelf-Dev/1.0"}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=15.0, follow_redirects=True)
            if response.status_code == 200:
                data = response.json()
                return data.get("products", [])
            else:
                print(f"Status {response.status_code} for {category_tag}")
        except Exception as e:
            print(f"Error fetching category {category_tag}: {e}")
    return []

async def seed_inventory():
    print("Initializing database...")
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        
    print("Fetching products from OpenFoodFacts API...")
    seen_barcodes = set()
    category_product_map = {}
    
    for cat_name, off_tag in CATEGORIES.items():
        print(f"Fetching {cat_name} ({off_tag})...")
        products = await fetch_off_products(off_tag, limit=PRODUCTS_PER_CATEGORY)
        category_product_map[cat_name] = products

    print("Seeding database...")
    async with async_session() as session:
        stores = (await session.exec(select(Store))).all()
        if not stores:
            print("No stores found! Please run seed_stores.py first.")
            return

        for cat_name, off_tag in CATEGORIES.items():
            cat = (await session.exec(select(Category).where(Category.off_tag == off_tag))).first()
            if not cat:
                cat = Category(uuid=str(uuid.uuid4()), name=cat_name, off_tag=off_tag)
                session.add(cat)
                await session.flush()

            cat_type = "Others"
            if cat_name in ["Bakery", "Cereals", "Pasta", "Canned Foods"]:
                cat_type = "Staples"
            elif cat_name in ["Dairy", "Meats", "Fruits", "Vegetables", "Frozen Foods"]:
                cat_type = "Perishables"

            for row in category_product_map.get(cat_name, []):
                barcode = str(row.get("code", ""))
                if not barcode or barcode == "nan":
                    continue
                    
                existing_prod = (await session.exec(select(Product).where(Product.barcode == barcode))).first()
                if existing_prod:
                    prod = existing_prod
                else:
                    product_name = str(row.get("product_name", f"Unknown Product {barcode}"))
                    product_image = row.get("image_url", None)
                    brand = row.get("brands", None)
                    qty_str = row.get("quantity", None)
                    
                    prod = Product(
                        uuid=str(uuid.uuid4()),
                        barcode=barcode,
                        product_name=product_name,
                        product_image=str(product_image) if product_image else None,
                        brand=str(brand) if brand else None,
                        quantity=str(qty_str) if qty_str else None
                    )
                    session.add(prod)
                    await session.flush()
                
                #link between product and category
                link = (await session.exec(select(ProductCategory).where(
                    ProductCategory.product_id == prod.id,
                    ProductCategory.category_id == cat.id
                ))).first()
                if not link:
                    session.add(ProductCategory(product_id=prod.id, category_id=cat.id))

                if barcode in seen_barcodes:
                    continue
                seen_barcodes.add(barcode)
                
                #assign 30% of the stock to the stores
                for store in stores:
                    if random.random() <= 0.30:
                        if cat_type == "Staples":
                            stock_qty = random.randint(50, 150)
                        elif cat_type == "Perishables":
                            stock_qty = random.randint(5, 30)
                        else:
                            stock_qty = random.randint(10, 50)
                            
                        price = round(random.uniform(20.0, 1500.0), 2)
                        
                        inv = StoreInventory(
                            store_id=store.id,
                            product_id=prod.id,
                            stock_quantity=stock_qty,
                            price=float(price)
                        )
                        await session.merge(inv)
                
        await session.commit()
    print(f"Seeding complete! Inserted {len(seen_barcodes)} unique products across {len(CATEGORIES)} categories into multiple stores.")

if __name__ == "__main__":
    asyncio.run(seed_inventory())
