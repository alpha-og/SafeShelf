from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from app.guidelines.schemas import GuidelineResponse, ImportResponse
from app.guidelines.service import get_aliases, get_guideline_by_code, import_guidelines
from app.shared.deps import get_session

router = APIRouter(prefix='/guidelines', tags=['guidelines'])


@router.post('/import', response_model=ImportResponse)
async def import_all(session: AsyncSession = Depends(get_session)):
    return await import_guidelines(session)


@router.get('/aliases')
async def get_all_aliases(session: AsyncSession = Depends(get_session)):
    return await get_aliases(session)


@router.get('/{code}', response_model=GuidelineResponse)
async def get_by_code(code: str, session: AsyncSession = Depends(get_session)):
    return await get_guideline_by_code(code, session)
