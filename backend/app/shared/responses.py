from datetime import datetime
from typing import Any

from fastapi import Request
from pydantic import BaseModel


class Metadata(BaseModel):
    timestamp: datetime
    model_config = {'extra': 'allow'}


def set_metadata(request: Request, **kwargs: Any) -> None:
    request.scope['_envelope_meta'] = kwargs
