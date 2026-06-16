from fastapi import APIRouter, Depends

from app.sessions.schemas import EventRequest, EventResponse
from app.sessions.service import log_event
from app.shared.deps import get_current_user, get_session

router = APIRouter(prefix='/sessions', tags=['sessions'])


@router.post('/events', response_model=EventResponse, status_code=201)
async def events(
    req: EventRequest,
    session=Depends(get_session),
    _current_user=Depends(get_current_user),
):
    return await log_event(req, session)
