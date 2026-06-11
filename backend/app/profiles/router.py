from fastapi import APIRouter, Depends

from app.profiles.schemas import BackupRequest, BackupResponse
from app.profiles.service import get_backup, store_backup
from app.shared.deps import get_current_user, get_session

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.post("/backup", response_model=BackupResponse, status_code=201)
async def backup(
    req: BackupRequest,
    session=Depends(get_session),
    _current_user=Depends(get_current_user),
):
    return await store_backup(req, session)


@router.get("/backup/{backup_id}", response_model=BackupResponse)
async def restore(
    backup_id: str,
    session=Depends(get_session),
    _current_user=Depends(get_current_user),
):
    return await get_backup(backup_id, session)
