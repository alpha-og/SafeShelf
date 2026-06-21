import logging
import time
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)


@asynccontextmanager
async def log_duration(name: str):
    start = time.perf_counter()
    try:
        yield
    finally:
        elapsed = (time.perf_counter() - start) * 1000
        logger.debug('TIMER %s %.1fms', name, elapsed)
