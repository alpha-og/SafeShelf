from pydantic import BaseModel


class EventRequest(BaseModel):
    event_type: str
    payload: dict = {}
    timestamp: str | None = None


class EventResponse(BaseModel):
    id: str
    accepted: bool
