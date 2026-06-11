import hashlib
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import selectinload
from sqlmodel import select, update

from app.auth.models import Device, RefreshToken, User
from app.auth.schemas import DeviceRegisterRequest, LoginRequest, SignInRequest
from app.shared.config import settings
from app.shared.security import create_access_token, hash_password, verify_password


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def _generate_refresh_token() -> tuple[str, str]:
    raw = uuid.uuid4().hex
    return raw, _hash_token(raw)


async def signin(req: SignInRequest, session) -> User:
    existing = await session.exec(select(User).where(User.email == req.email))
    if existing.first():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(email=req.email, hashed_password=hash_password(req.password))
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def login(req: LoginRequest, session) -> tuple[str, str]:
    result = await session.exec(select(User).where(User.email == req.email))
    user = result.first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({"sub": str(user.id)})
    raw_refresh, token_hash = _generate_refresh_token()

    device_pk: int | None = None
    if req.device_id:
        device = (
            await session.exec(
                select(Device).where(Device.device_uuid == req.device_id)
            )
        ).first()
        if device is None:
            raise HTTPException(status_code=404, detail="Device not found")
        if device.user_id is not None and device.user_id != user.id:
            raise HTTPException(
                status_code=403, detail="Device belongs to another user"
            )
        if device.user_id is None:
            device.user_id = user.id
            session.add(device)
        device_pk = device.id

    refresh = RefreshToken(
        token_hash=token_hash,
        user_id=user.id,
        device_id=device_pk,
        expires_at=datetime.now(timezone.utc)
        + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    session.add(refresh)
    await session.commit()

    return access_token, raw_refresh


async def refresh(raw_token: str | None, session) -> tuple[str, str]:
    if not raw_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    token_hash = _hash_token(raw_token)
    now = datetime.now(timezone.utc)

    result = await session.exec(
        update(RefreshToken)
        .where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at > now,
        )
        .values(revoked_at=now)
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    token = (
        await session.exec(
            select(RefreshToken)
            .where(RefreshToken.token_hash == token_hash)
            .options(selectinload(RefreshToken.user))
        )
    ).first()

    access_token = create_access_token({"sub": str(token.user_id)})
    raw_new, new_hash = _generate_refresh_token()

    new_token = RefreshToken(
        token_hash=new_hash,
        user_id=token.user_id,
        device_id=token.device_id,
        expires_at=datetime.now(timezone.utc)
        + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    session.add(new_token)
    await session.commit()

    return access_token, raw_new


async def signout(raw_token: str | None, session) -> None:
    if not raw_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    token_hash = _hash_token(raw_token)
    result = await session.exec(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked_at.is_(None),
        )
    )
    token = result.first()
    if token:
        token.revoked_at = datetime.now(timezone.utc)
        session.add(token)
        await session.commit()


async def register_device(req: DeviceRegisterRequest, session) -> dict:
    device = Device(
        device_uuid=uuid.uuid4().hex,
        device_name=req.device_name,
        device_type=req.device_type,
    )
    session.add(device)
    await session.commit()
    await session.refresh(device)
    return {"device_id": device.device_uuid, "device_name": device.device_name}
