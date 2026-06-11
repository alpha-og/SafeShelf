from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlmodel import SQLModel

from app.api.v1 import v1_router
from app.shared.db import engine
from app.shared.exceptions import global_exception_handler
from app.shared.middleware import setup_middleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    lifespan=lifespan,
    title="SafeShelf API",
    version="0.1.0",
)

setup_middleware(app)
app.add_exception_handler(Exception, global_exception_handler)
app.include_router(v1_router)
