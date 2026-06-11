from fastapi import APIRouter, Depends

from app.auth.models import User
from app.auth.schemas import (
    DeviceRegisterRequest,
    DeviceRegisterResponse,
    LoginRequest,
    RefreshRequest,
    SignUpRequest,
    TokenResponse,
    UserResponse,
)
from app.auth.service import login, logout, refresh, register_device, signup
from app.shared.deps import get_current_user, get_session

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=UserResponse, status_code=201)
async def register(req: SignUpRequest, session=Depends(get_session)):
    return await signup(req, session)


@router.post("/login", response_model=TokenResponse)
async def login_route(req: LoginRequest, session=Depends(get_session)):
    token = await login(req, session)
    return TokenResponse(access_token=token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_route(req: RefreshRequest, session=Depends(get_session)):
    token = await refresh(req.refresh_token, session)
    return TokenResponse(access_token=token)


@router.post("/logout", status_code=204)
async def logout_route(
    session=Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    await logout(current_user, session)


@router.post("/device/register", response_model=DeviceRegisterResponse)
async def device_register(
    req: DeviceRegisterRequest,
    session=Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return await register_device(req, current_user, session)


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
