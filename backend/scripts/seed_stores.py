import asyncio
from sqlmodel import SQLModel, select
from app.shared.db import engine, async_session
from app.stores.models import Store, StoreInventory
from app.products.models import Product, Category, ProductCategory

async def seed_stores():
    print("Initializing database...")
    async with engine.begin() as conn:
        
        await conn.run_sync(SQLModel.metadata.create_all)
        
    stores_to_seed = [
        Store(uuid="main", name="SafeShelf Kochi Central", address="MG Road, Ernakulam", city="Kochi", lat=9.9816, lon=76.2999, hours="8:00 AM - 10:00 PM"),
        Store(uuid="tvm-palayam", name="SafeShelf Trivandrum", address="Palayam", city="Thiruvananthapuram", lat=8.5035, lon=76.9533, hours="7:00 AM - 11:00 PM"),
        Store(uuid="calicut-sm", name="SafeShelf Kozhikode", address="SM Street", city="Kozhikode", lat=11.2588, lon=75.7804, hours="9:00 AM - 9:00 PM"),
        Store(uuid="thrissur-round", name="SafeShelf Thrissur", address="Swaraj Round", city="Thrissur", lat=10.5276, lon=76.2144, hours="8:00 AM - 10:00 PM"),
        Store(uuid="palakkad-stadium", name="SafeShelf Palakkad", address="Stadium Bypass Road", city="Palakkad", lat=10.7867, lon=76.6548, hours="7:30 AM - 9:30 PM"),
        Store(uuid="kottayam-baker", name="SafeShelf Kottayam", address="Baker Junction", city="Kottayam", lat=9.5916, lon=76.5222, hours="8:00 AM - 9:00 PM"),
        Store(uuid="kannur-thavakkara", name="SafeShelf Kannur", address="Thavakkara", city="Kannur", lat=11.8745, lon=75.3704, hours="8:00 AM - 10:00 PM"),
        Store(uuid="alappuzha-mullakkal", name="SafeShelf Alappuzha", address="Mullakkal", city="Alappuzha", lat=9.4981, lon=76.3388, hours="9:00 AM - 8:00 PM"),
    ]
    
    print("Seeding stores...")
    async with async_session() as session:
        for new_store in stores_to_seed:
            existing = (await session.exec(select(Store).where(Store.uuid == new_store.uuid))).first()
            if not existing:
                session.add(new_store)
                print(f"Added store: {new_store.name}")
            else:
                print(f"Store already exists: {new_store.name}")
                
        await session.commit()
    print("Store seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed_stores())
