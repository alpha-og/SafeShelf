import asyncio
import random
import uuid

import httpx
from sqlmodel import SQLModel, select

from app.products.models import Category, Product, ProductCategory
from app.shared.db import async_session, engine
from app.stores.models import Store, StoreInventory
from scripts.lib.logger import info, success, warn

CATEGORIES = {
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
}

STORES = [
    Store(uuid='main', name='SafeShelf Kochi Central', address='MG Road, Ernakulam',
          city='Kochi', lat=9.9816, lon=76.2999, hours='8:00 AM - 10:00 PM'),
    Store(uuid='tvm-palayam', name='SafeShelf Trivandrum', address='Palayam',
          city='Thiruvananthapuram', lat=8.5035, lon=76.9533, hours='7:00 AM - 11:00 PM'),
    Store(uuid='calicut-sm', name='SafeShelf Kozhikode', address='SM Street',
          city='Kozhikode', lat=11.2588, lon=75.7804, hours='9:00 AM - 9:00 PM'),
    Store(uuid='thrissur-round', name='SafeShelf Thrissur', address='Swaraj Round',
          city='Thrissur', lat=10.5276, lon=76.2144, hours='8:00 AM - 10:00 PM'),
    Store(uuid='palakkad-stadium', name='SafeShelf Palakkad', address='Stadium Bypass Road',
          city='Palakkad', lat=10.7867, lon=76.6548, hours='7:30 AM - 9:30 PM'),
    Store(uuid='kottayam-baker', name='SafeShelf Kottayam', address='Baker Junction',
          city='Kottayam', lat=9.5916, lon=76.5222, hours='8:00 AM - 9:00 PM'),
    Store(uuid='kannur-thavakkara', name='SafeShelf Kannur', address='Thavakkara',
          city='Kannur', lat=11.8745, lon=75.3704, hours='8:00 AM - 10:00 PM'),
    Store(uuid='alappuzha-mullakkal', name='SafeShelf Alappuzha', address='Mullakkal',
          city='Alappuzha', lat=9.4981, lon=76.3388, hours='9:00 AM - 8:00 PM'),
]


async def _seed_stores():
    info('Seeding stores...')
    async with async_session() as session:
        for store in STORES:
            existing = (await session.exec(select(Store).where(Store.uuid == store.uuid))).first()
            if not existing:
                session.add(store)
                info(f'Added store: {store.name}')
            else:
                warn(f'Store already exists: {store.name}')
        await session.commit()
    success('Stores seeded')


async def _fetch_off_products(category_tag: str, limit: int = 30) -> list[dict]:
    url = f'https://world.openfoodfacts.org/api/v2/search?categories_tags={category_tag}&countries_tags=india&fields=code,product_name,image_url,brands,quantity&page_size={limit}'
    headers = {'User-Agent': 'SafeShelf-Dev/1.0'}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=15.0, follow_redirects=True)
            if response.status_code == 200:
                return response.json().get('products', [])
            warn(f'HTTP {response.status_code} for {category_tag}')
        except Exception as e:
            warn(f'Error fetching {category_tag}: {e}')
    return []


async def _seed_inventory():
    seen_barcodes: set[str] = set()
    category_product_map: dict[str, list[dict]] = {}

    info('Fetching products from OpenFoodFacts...')
    for cat_name, off_tag in CATEGORIES.items():
        info(f'  Fetching {cat_name} ({off_tag})...')
        category_product_map[cat_name] = await _fetch_off_products(off_tag)
        await asyncio.sleep(1)
    success('API fetch complete')

    import json
    import os
    
    CUSTOM_PRODUCE = []
    data_path = os.path.join('data', 'fresh_produce.json')
    if os.path.exists(data_path):
        try:
            with open(data_path, 'r', encoding='utf-8') as f:
                CUSTOM_PRODUCE = json.load(f)
        except Exception as e:
            warn(f"Failed to load custom produce dataset: {e}")
            
    for item in CUSTOM_PRODUCE:
        cat_name = item.get('category', 'Vegetables')
        if cat_name not in category_product_map:
            category_product_map[cat_name] = []
        category_product_map[cat_name].append({
            'code': item.get('barcode', item.get('code')),
            'product_name': item.get('product_name'),
            'image_url': item.get('image_url'),
            'brands': 'Fresh Farm Produce',
            'quantity': item.get('quantity')
        })



    info('Seeding products and inventory...')
    async with async_session() as session:
        stores = (await session.exec(select(Store))).all()
        if not stores:
            warn('No stores found! Run seed with --stores-only first.')
            return

        for cat_name, off_tag in CATEGORIES.items():
            cat = (await session.exec(select(Category).where(Category.off_tag == off_tag))).first()
            if not cat:
                cat = Category(uuid=str(uuid.uuid4()), name=cat_name, off_tag=off_tag)
                session.add(cat)
                await session.flush()

            cat_type = 'Others'
            if cat_name in {'Bakery', 'Cereals', 'Pasta', 'Canned Foods'}:
                cat_type = 'Staples'
            elif cat_name in {'Dairy', 'Meats', 'Fruits', 'Vegetables', 'Frozen Foods'}:
                cat_type = 'Perishables'

            for row in category_product_map.get(cat_name, []):
                barcode = str(row.get('code', ''))
                if not barcode or barcode == 'nan':
                    continue

                stmt = select(Product).where(Product.barcode == barcode)
                existing = (await session.exec(stmt)).first()
                if existing:
                    prod = existing
                else:
                    prod = Product(
                        uuid=str(uuid.uuid4()),
                        barcode=barcode,
                        product_name=str(row.get('product_name', f'Unknown Product {barcode}')),
                        product_image=str(row['image_url']) if row.get('image_url') else None,
                        brand=str(row['brands']) if row.get('brands') else None,
                        quantity=str(row['quantity']) if row.get('quantity') else None,
                    )
                    session.add(prod)
                    await session.flush()

                link = (await session.exec(select(ProductCategory).where(
                    ProductCategory.product_id == prod.id,
                    ProductCategory.category_id == cat.id,
                ))).first()
                if not link:
                    session.add(ProductCategory(product_id=prod.id, category_id=cat.id))

                if barcode in seen_barcodes:
                    continue
                seen_barcodes.add(barcode)

                is_custom = barcode.startswith('PROD-')
                is_produce = cat_name in ('Fruits', 'Vegetables')

                for store in stores:
                    prob = 0.30
                    if is_custom:
                        prob = 0.95
                    elif is_produce:
                        prob = 0.70

                    if random.random() <= prob:
                        if cat_type == 'Staples':
                            stock_qty = random.randint(50, 150)
                        elif cat_type == 'Perishables':
                            stock_qty = random.randint(20, 80)
                        else:
                            stock_qty = random.randint(10, 50)
                        
                        if is_custom:
                            price = round(random.uniform(30.0, 150.0), 2)
                        else:
                            price = round(random.uniform(20.0, 1500.0), 2)
                            
                        await session.merge(StoreInventory(
                            store_id=store.id,
                            product_id=prod.id,
                            stock_quantity=stock_qty,
                            price=float(price),
                        ))

        await session.commit()
    success(f'Seeded {len(seen_barcodes)} products across {len(CATEGORIES)} categories')


async def run_seed(stores_only: bool = False, inventory_only: bool = False) -> None:
    info('Initializing database...')
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    if not inventory_only:
        await _seed_stores()
    if not stores_only:
        await _seed_inventory()

    success('All done')
