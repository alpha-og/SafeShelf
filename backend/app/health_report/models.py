from datetime import datetime
from typing import Any

from sqlalchemy import JSON
from sqlmodel import Field, Relationship, SQLModel

from app.auth.models import User
from app.shared.utils import utcnow as _utcnow


class HealthReport(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key='user.id', ondelete='CASCADE', index=True)
    file_name: str
    extracted_data: dict[str, Any] = Field(default_factory=dict, sa_type=JSON)
    report_date: str | None = Field(default=None)
    laboratory: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=_utcnow)

    user: User = Relationship(back_populates='health_reports')
