from fastapi import APIRouter, Depends, UploadFile
from sqlmodel.ext.asyncio.session import AsyncSession

from app.health_report.schemas import HealthReportSummary, HealthReportUploadResponse
from app.health_report.service import list_reports, upload_and_extract_report
from app.shared.deps import get_current_user, get_session

router = APIRouter(prefix='/health-report', tags=['health-report'])


@router.post('/upload', response_model=HealthReportUploadResponse, status_code=201)
async def upload_report(
    file: UploadFile,
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user),
):
    return await upload_and_extract_report(file, current_user.id, session)


@router.get('/', response_model=list[HealthReportSummary])
async def get_reports(
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user),
):
    return await list_reports(current_user.id, session)
