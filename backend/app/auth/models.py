import uuid
from datetime import datetime, timezone

from sqlmodel import Field, Relationship, SQLModel


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    refresh_tokens: list["RefreshToken"] = Relationship(back_populates="user")
    devices: list["Device"] = Relationship(back_populates="user")


class RefreshToken(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    token_hash: str = Field(index=True)
    user_id: int = Field(foreign_key="user.id")
    device_id: int | None = Field(default=None, foreign_key="device.id")
    expires_at: datetime
    revoked_at: datetime | None = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    user: User = Relationship(back_populates="refresh_tokens")


class Device(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    device_uuid: str = Field(default_factory=lambda: uuid.uuid4().hex, unique=True, index=True)
    user_id: int | None = Field(default=None, foreign_key="user.id")
    device_name: str
    device_type: str = Field(default="mobile")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    user: User | None = Relationship(back_populates="devices")
