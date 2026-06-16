import asyncio
import uuid
from sqlmodel import SQLModel, select
from sqlalchemy import text
from app.shared.db import engine, async_session
from app.shared.config import settings
from sqlalchemy.engine import make_url

from app.stores.models import Store, StoreInventory
from app.products.models import Product

async def migrate():
    print("Starting product catalog data migration...")
    _url = make_url(settings.DATABASE_URL)
    is_sqlite = _url.drivername.startswith('sqlite')
    
    print("Ensuring tables exist...")
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        
    print("Checking if data migration is needed...")
    async with engine.begin() as conn:
        if is_sqlite:
            res = await conn.execute(text("PRAGMA table_info(storeinventory)"))
            columns = [row[1] for row in res.fetchall()]
            
            if 'product_name' in columns:
                print("Migrating SQLite old storeinventory to separated Product catalog...")
                pass
            else:
                print("SQLite database already migrated.")
                return
        else:
            res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='storeinventory' and column_name='product_name'"))
            if res.fetchall():
                pass
            else:
                print("Postgres database already migrated.")
                return
    print("Extracting unique products and creating Product records...")
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT DISTINCT product_id, product_name, product_image FROM storeinventory"))
        old_products = result.fetchall()
        
    if not old_products:
        print("No products to migrate.")
    else:
        print(f"Found {len(old_products)} unique products to migrate.")
        
        async with async_session() as session:
            barcode_to_id = {}
            for row in old_products:
                old_barcode, name, image = row[0], row[1], row[2]
                
                prod = (await session.execute(select(Product).where(Product.barcode == old_barcode))).scalar_one_or_none()
                if not prod:
                    prod = Product(
                        uuid=str(uuid.uuid4()),
                        barcode=old_barcode,
                        product_name=name,
                        product_image=image
                    )
                    session.add(prod)
                    await session.commit()
                    await session.refresh(prod)
                
                barcode_to_id[old_barcode] = prod.id

            print("Created Products. Rebuilding StoreInventory...")
            
            inv_result = await session.execute(text("SELECT store_id, product_id, stock_quantity, price, in_stock FROM storeinventory"))
            old_inventory = inv_result.fetchall()
            
    async with engine.begin() as conn:
        print("Dropping old StoreInventory table and recreating it...")
        await conn.execute(text("DROP TABLE storeinventory"))
        await conn.run_sync(SQLModel.metadata.create_all)
        
    print("Inserting updated StoreInventory records...")
    async with async_session() as session:
        for row in old_inventory:
            s_id, old_p_id, qty, price, in_stock = row[0], row[1], row[2], row[3], row[4]
            new_p_id = barcode_to_id.get(old_p_id)
            if new_p_id:
                new_inv = StoreInventory(
                    store_id=s_id,
                    product_id=new_p_id,
                    stock_quantity=qty,
                    price=price,
                    in_stock=in_stock
                )
                session.add(new_inv)
        await session.commit()

    print("Migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(migrate())
