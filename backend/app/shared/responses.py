from datetime import datetime, timezone

from fastapi import Request
from pydantic import BaseModel
from typing import Any


class Metadata(BaseModel):
    timestamp: datetime
    model_config = {"extra": "allow"}


def set_metadata(request: Request, **kwargs: Any) -> None:
    request.scope["_envelope_meta"] = kwargs
