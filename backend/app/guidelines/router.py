from fastapi import APIRouter

from app.guidelines.schemas import BootstrapResponse
from app.guidelines.service import get_bootstrap

router = APIRouter(prefix="/guidelines", tags=["guidelines"])


@router.get("/bootstrap", response_model=BootstrapResponse)
async def bootstrap():
    return await get_bootstrap()
