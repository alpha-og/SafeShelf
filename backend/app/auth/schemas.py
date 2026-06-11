from datetime import datetime

from pydantic import BaseModel, EmailStr


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    device_id: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    created_at: datetime


class DeviceRegisterRequest(BaseModel):
    device_name: str
    device_type: str = "mobile"


class DeviceRegisterResponse(BaseModel):
    device_id: str
    device_name: str
