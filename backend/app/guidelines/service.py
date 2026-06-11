from fastapi import HTTPException, status


async def get_bootstrap() -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented")
