from fastapi import HTTPException, status

from app.sessions.schemas import EventRequest


async def log_event(req: EventRequest, session) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail='Not implemented')
