from fastapi import HTTPException, status
from sqlmodel import select

from app.auth.models import User
from app.auth.schemas import DeviceRegisterRequest, SignUpRequest
from app.shared.security import (
    create_access_token,
    hash_password,
    verify_password,
)


async def signup(req: SignUpRequest, session) -> User:
    existing = await session.exec(select(User).where(User.email == req.email))
    if existing.first():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(email=req.email, hashed_password=hash_password(req.password))
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def login(req: SignUpRequest, session) -> str:
    result = await session.exec(select(User).where(User.email == req.email))
    user = result.first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return create_access_token({"sub": user.email})


async def refresh(_refresh_token: str, session) -> str:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented")


async def logout(_user: User, session) -> None:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented")


async def register_device(_req: DeviceRegisterRequest, _user: User, session) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented")
