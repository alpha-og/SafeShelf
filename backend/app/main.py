import logging
import sys
from contextlib import asynccontextmanager

# Must be imported before SQLAlchemy to patch platform.machine(),
# which can hang on Windows due to a WMI query in Python 3.14.
from app.shared import _patch_platform  # noqa: F401

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from sqlmodel import SQLModel

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(levelname)s:     %(message)s")

from app.api.v1 import v1_router
from app.shared.config import settings
from app.shared.db import engine
from app.shared.exceptions import global_exception_handler, http_exception_handler, validation_exception_handler
from app.shared.middleware import setup_middleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)
    except Exception:
        logger.exception("Failed to connect to database at %s", settings.DATABASE_URL)
        sys.exit(1)
    yield
    await engine.dispose()


app = FastAPI(
    lifespan=lifespan,
    title="SafeShelf API",
    version="0.1.0",
)

setup_middleware(app)
app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.include_router(v1_router)
