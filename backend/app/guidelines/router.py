from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from app.guidelines.schemas import BootstrapResponse, GuidelineListResponse, GuidelineResponse, ImportResponse
from app.guidelines.service import get_bootstrap, get_guideline, import_guidelines, list_guidelines
from app.shared.deps import get_session

router = APIRouter(prefix="/guidelines", tags=["guidelines"])


@router.post("/import", response_model=ImportResponse)
async def import_all(session: AsyncSession = Depends(get_session)):
    return await import_guidelines(session)
