import asyncio
import os
import kagglehub
import pandas as pd
from sqlmodel import SQLModel
from app.shared.db import engine, async_session
from app.stores.models import StoreInventory, Store

async def seed_inventory():
    print("Initializing database...")
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        
    print("Setting up default Main Store...")
    async with async_session() as session:
        from sqlmodel import select
        store = (await session.exec(select(Store).where(Store.uuid == "main"))).first()
        if not store:
            store = Store(uuid="main", name="Main Store", address="123 Grocery Ave", city="Metropolis")
            session.add(store)
            await session.commit()
            await session.refresh(store)
        store_id = store.id

    print("Downloading Open Food Facts dataset (this might take a minute)...")
    path = kagglehub.dataset_download('openfoodfacts/world-food-facts')
    tsv_files = [f for f in os.listdir(path) if f.endswith('.tsv') or f.endswith('.csv')]
    
    if not tsv_files:
        print("No TSV/CSV found in dataset.")
        return
        
    file_path = os.path.join(path, tsv_files[0])
    print(f"Reading {file_path} (loading first 10000 rows)...")
    
    import random
    
    #reading only 10k rows.
    try:
        df = pd.read_csv(file_path, sep='\t', nrows=10000, on_bad_lines='skip', low_memory=False)
    except:
        df = pd.read_csv(file_path, nrows=10000, on_bad_lines='skip', low_memory=False)
        
    if 'product_name' in df.columns:
        df = df[df['product_name'].notna()]
    
    print(f"Seeding {len(df)} records into StoreInventory...")
    async with async_session() as session:
        from sqlmodel import select
        from app.products.models import Product
        import uuid
        for idx, row in df.iterrows():
            #barcode
            barcode = str(row.get("code", f"PROD_{idx}"))
            if barcode == "nan" or not barcode.strip():
                continue
                
            #name
            product_name = str(row.get("product_name", f"Unknown Product {idx}"))
            
            #if image is available
            product_image = row.get("image_url", None)
            if pd.isna(product_image):
                product_image = None
            else:
                product_image = str(product_image)
                
            prod = (await session.exec(select(Product).where(Product.barcode == barcode))).first()
            if not prod:
                brand = row.get("brands", None)
                qty_str = row.get("quantity", None)
                prod = Product(
                    uuid=str(uuid.uuid4()),
                    barcode=barcode,
                    product_name=product_name,
                    product_image=product_image,
                    brand=str(brand) if pd.notna(brand) else None,
                    quantity=str(qty_str) if pd.notna(qty_str) else None
                )
                session.add(prod)
                await session.flush()
                
            #mock stock and price
            stock_qty = random.randint(0, 100)
            price = round(random.uniform(20.0, 1500.0))
            
            inv = StoreInventory(
                store_id=store_id,
                product_id=prod.id,
                stock_quantity=stock_qty,
                price=float(price),
                in_stock=(stock_qty > 0)
            )
            await session.merge(inv)
            
        #Nutella to test
        nutella_prod = (await session.exec(select(Product).where(Product.barcode == "3017624010701"))).first()
        if not nutella_prod:
            nutella_prod = Product(
                uuid=str(uuid.uuid4()),
                barcode="3017624010701",
                product_name="Nutella Ferrero",
                product_image="https://images.openfoodfacts.org/images/products/301/762/401/0701/front_en.189.400.jpg"
            )
            session.add(nutella_prod)
            await session.flush()
            
        nutella_inv = StoreInventory(
            store_id=store_id,
            product_id=nutella_prod.id,
            stock_quantity=50,
            price=399.0, 
            in_stock=True
        )
        await session.merge(nutella_inv)
        
        await session.commit()
    print("Seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed_inventory())
