from fastapi import HTTPException, status

from app.profiles.schemas import BackupRequest


async def store_backup(req: BackupRequest, session) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented")


async def get_backup(backup_id: str, session) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented")
