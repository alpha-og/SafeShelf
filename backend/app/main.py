import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from sqlmodel import SQLModel

# Must be imported before SQLAlchemy to patch platform.machine(),
# which can hang on Windows due to a WMI query in Python 3.14.
from app.shared import _patch_platform  # noqa: F401

from app.shared.config import settings

logger = logging.getLogger(__name__)
logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO), format='%(levelname)s:     %(message)s')

from app.api.v1 import v1_router
from app.shared.db import engine
from app.shared.exceptions import (
    global_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)
from app.shared.middleware import setup_middleware

import app.products.models
import app.recipes.models  


@asynccontextmanager
async def lifespan(app: FastAPI):
    missing = settings.get_missing_required()
    if missing:
        logger.error(
            'Required environment variables are missing:\n  %s\n'
            'Set them in backend/.env.local or as environment variables.\n'
            'Server startup aborted.',
            '\n  '.join(f'- {k}' for k in missing),
        )
        os._exit(1)

    try:
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)
    except Exception:
        logger.exception('Failed to connect to database at %s', settings.DATABASE_URL)
        os._exit(1)
    yield
    await engine.dispose()


app = FastAPI(
    lifespan=lifespan,
    title='SafeShelf API',
    version='0.1.0',
)

setup_middleware(app)
app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.include_router(v1_router)
