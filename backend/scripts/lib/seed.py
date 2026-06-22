import asyncio
import json
import os
import random
import uuid

import httpx
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel import SQLModel, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.products.models import Category, Product, ProductCategory
from app.shared.config import settings
from app.shared.db import async_session, engine
from app.stores.models import Store
from scripts.lib.logger import info, success, warn

SEED_TABLES = [
    'store',
    'category',
    'product',
    'recipe',
    'productcategory',
    'storeinventory',
]

# Categories that are fetched from OpenFoodFacts API
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
    # Synthetic categories — populated from local JSON files
    'Pantry Staples': 'syn-pantry-staples',
    'Herbs & Spices': 'syn-herbs-spices',
    'Oils & Condiments': 'syn-oils-condiments',
    'Regional Kerala': 'syn-regional-kerala',
    'Grains & Baking': 'syn-grains-baking',
}

# Category → store-distribution type for inventory stock levels
CAT_TYPE: dict[str, str] = {
    'Bakery': 'Staples',
    'Cereals': 'Staples',
    'Pasta': 'Staples',
    'Canned Foods': 'Staples',
    'Pantry Staples': 'Staples',
    'Grains & Baking': 'Staples',
    'Dairy': 'Perishables',
    'Meats': 'Perishables',
    'Fruits': 'Perishables',
    'Vegetables': 'Perishables',
    'Frozen Foods': 'Perishables',
    'Herbs & Spices': 'Perishables',
    'Regional Kerala': 'Perishables',
    'Oils & Condiments': 'Others',
}

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'data')

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


def _make_session_maker(db_url: str | None = None):
    if db_url:
        url = make_url(db_url)
        connect_args = (
            {'timeout': 5}
            if not url.drivername.startswith('sqlite')
            else {'check_same_thread': False}
        )
        eng = create_async_engine(db_url, echo=settings.DB_ECHO, connect_args=connect_args)
        return eng, async_sessionmaker(eng, class_=AsyncSession, expire_on_commit=False)
    return engine, async_session


async def _truncate_seed_tables(session):
    for table in reversed(SEED_TABLES):
        await session.execute(text(f'DELETE FROM {table}'))


async def _seed_stores(session_maker=None):
    info('Seeding stores...')
    sm = session_maker or async_session
    async with sm() as session:
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
    async with httpx.AsyncClient(verify=False) as client:
        try:
            response = await client.get(url, headers=headers, timeout=15.0, follow_redirects=True)
            if response.status_code == 200:
                return response.json().get('products', [])
            warn(f'HTTP {response.status_code} for {category_tag}')
        except Exception as e:
            warn(f'Error fetching {category_tag}: {e}')
    return []


async def _seed_inventory(session_maker=None):
    sm = session_maker or async_session
    seen_barcodes: set[str] = set()
    category_product_map: dict[str, list[dict]] = {}

    # Phase 1: Fetch from OpenFoodFacts (only for categories with genuine OFF tags)
    info('Fetching products from OpenFoodFacts...')
    for cat_name, off_tag in CATEGORIES.items():
        if off_tag and not off_tag.startswith('syn-'):
            info(f'  Fetching {cat_name} ({off_tag})...')
            category_product_map[cat_name] = await _fetch_off_products(off_tag)
            await asyncio.sleep(1)
        else:
            category_product_map[cat_name] = []
    success('API fetch complete')

    # Phase 2: Load all custom seed data from data/*.json
    info('Loading custom seed data from data/...')
    data_dir = DATA_DIR
    loaded_files = 0
    for fname in sorted(os.listdir(data_dir)):
        if not fname.endswith('.json'):
            continue
        fpath = os.path.join(data_dir, fname)
        try:
            with open(fpath, encoding='utf-8') as f:
                items = json.load(f)
        except Exception as e:
            warn(f"Failed to load {fname}: {e}")
            continue

        if not isinstance(items, list):
            continue

        for item in items:
            cat_name = item.get('category', 'Pantry Staples')
            if cat_name not in category_product_map:
                category_product_map[cat_name] = []

            brand = item.get('brands') or item.get('brand') or 'SafeShelf'
            category_product_map[cat_name].append({
                'code': item.get('barcode', item.get('code', '')),
                'product_name': item.get('product_name', ''),
                'image_url': item.get('image_url'),
                'brands': brand,
                'quantity': item.get('quantity'),
            })
        loaded_files += 1
    success(f'Loaded {loaded_files} JSON files from data/')

    # Phase 3: Seed products and inventory
    info('Seeding products and inventory...')
    async with sm() as session:
        stores = (await session.exec(select(Store))).all()
        if not stores:
            warn('No stores found! Run seed with --stores-only first.')
            return

        for cat_name, off_tag in CATEGORIES.items():
            # Look up or create category
            if off_tag and not off_tag.startswith('syn-'):
                cat = (await session.exec(
                    select(Category).where(Category.off_tag == off_tag)
                )).first()
            else:
                cat = (await session.exec(
                    select(Category).where(Category.name == cat_name)
                )).first()
            if not cat:
                cat = Category(uuid=str(uuid.uuid4()), name=cat_name, off_tag=off_tag)
                session.add(cat)

            cat_type = CAT_TYPE.get(cat_name, 'Others')

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
                        brand=str(row.get('brands')) if row.get('brands') else None,
                        quantity=str(row.get('quantity')) if row.get('quantity') else None,
                    )
                    session.add(prod)

                link = (await session.exec(select(ProductCategory).where(
                    ProductCategory.product_id == prod.id,
                    ProductCategory.category_id == cat.id,
                ))).first()
                if not link:
                    session.add(ProductCategory(product_id=prod.id, category_id=cat.id))

                if barcode in seen_barcodes:
                    continue
                seen_barcodes.add(barcode)

                if len(seen_barcodes) % 50 == 0:
                    info(f'Processed {len(seen_barcodes)} unique products...')

                is_custom = barcode.startswith('PROD-')
                is_produce = cat_name in ('Fruits', 'Vegetables')

                inventory_rows = []
                for store in stores:
                    prob = 0.30
                    if is_custom:
                        prob = 0.95
                    elif is_produce:
                        prob = 0.70

                    if random.random() <= prob:
                        if cat_type == 'Staples':
                            stock_qty = random.randint(50, 150)
                        elif cat_type in ('Perishables',):
                            stock_qty = random.randint(20, 80)
                        else:
                            stock_qty = random.randint(10, 50)

                        if is_custom:
                            custom_price_map = {
                                'Dairy': (25, 400),
                                'Meats': (80, 800),
                                'Fruits': (20, 200),
                                'Vegetables': (15, 120),
                                'Herbs & Spices': (20, 150),
                                'Oils & Condiments': (40, 350),
                                'Pantry Staples': (20, 300),
                                'Canned Foods': (25, 200),
                                'Grains & Baking': (25, 300),
                                'Regional Kerala': (20, 250),
                            }
                            prange = custom_price_map.get(cat_name, (30.0, 150.0))
                            price = round(random.uniform(*prange), 2)
                        else:
                            price = round(random.uniform(20.0, 1500.0), 2)

                        inventory_rows.append({
                            'store_id': store.id,
                            'product_id': prod.id,
                            'stock_quantity': stock_qty,
                            'price': float(price),
                            'in_stock': stock_qty > 0,
                        })

                if inventory_rows:
                    params = {}
                    placeholders = []
                    for i, row in enumerate(inventory_rows):
                        idx = str(i)
                        params[f'sid_{idx}'] = row['store_id']
                        params[f'pid_{idx}'] = row['product_id']
                        params[f'sq_{idx}'] = row['stock_quantity']
                        params[f'pr_{idx}'] = row['price']
                        params[f'is_{idx}'] = row['in_stock']
                        placeholders.append(
                            f'(:sid_{idx}, :pid_{idx}, :sq_{idx}, :pr_{idx}, :is_{idx})'
                        )

                    cols = 'store_id, product_id, stock_quantity, price, in_stock'
                    conflict_set = (
                        'stock_quantity = EXCLUDED.stock_quantity, '
                        'price = EXCLUDED.price, '
                        'in_stock = EXCLUDED.in_stock'
                    )
                    await session.execute(
                        text(f"""
                            INSERT INTO storeinventory ({cols})
                            VALUES {', '.join(placeholders)}
                            ON CONFLICT (store_id, product_id)
                            DO UPDATE SET {conflict_set}
                        """),
                        params
                    )

        await session.commit()
    success(f'Seeded {len(seen_barcodes)} products across {len(CATEGORIES)} categories')


async def run_seed(
    stores_only: bool = False,
    inventory_only: bool = False,
    db_url: str | None = None,
    clean: bool = False,
) -> None:
    _engine, session_maker = _make_session_maker(db_url)

    info('Initializing database...')
    async with _engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    if clean:
        info('Clearing seed tables...')
        async with session_maker() as session:
            await _truncate_seed_tables(session)
            await session.commit()
        info('Seed tables cleared')

    if not inventory_only:
        await _seed_stores(session_maker)
    if not stores_only:
        await _seed_inventory(session_maker)

    if db_url:
        await _engine.dispose()

    success('All done')
