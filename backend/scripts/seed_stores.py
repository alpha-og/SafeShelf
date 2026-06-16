import asyncio
from sqlmodel import SQLModel, select
from app.shared.db import engine, async_session
from app.stores.models import Store

async def seed_stores():
    print("Initializing database...")
    async with engine.begin() as conn:
        
        await conn.run_sync(SQLModel.metadata.create_all)
        
    stores_to_seed = [
        Store(uuid="main", name="Main Store", address="123 Grocery Ave", city="Metropolis", lat=40.7128, lon=-74.0060, hours="8:00 AM - 10:00 PM"),
        Store(uuid="downtown", name="Downtown Branch", address="456 Market St", city="Metropolis", lat=40.7138, lon=-74.0070, hours="24 Hours"),
        Store(uuid="uptown", name="Uptown Branch", address="789 High St", city="Metropolis", lat=40.7158, lon=-74.0090, hours="9:00 AM - 9:00 PM"),
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
