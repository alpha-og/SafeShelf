from fastapi import APIRouter, Depends, Request, Response

from app.auth.models import User
from app.auth.schemas import (
    DeviceRegisterRequest,
    DeviceRegisterResponse,
    LoginRequest,
    SignInRequest,
    TokenResponse,
    UserResponse,
)
from app.auth.service import login, refresh, register_device, signin, signout
from app.shared.config import settings
from app.shared.deps import get_current_user, get_session

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE_MAX_AGE = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="strict",
        max_age=COOKIE_MAX_AGE,
        path="/v1/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key="refresh_token", path="/v1/auth")


@router.post("/signin", response_model=UserResponse, status_code=201)
async def register(req: SignInRequest, session=Depends(get_session)):
    return await signin(req, session)


@router.post("/login", response_model=TokenResponse)
async def login_route(
    req: LoginRequest,
    response: Response,
    session=Depends(get_session),
):
    access_token, refresh_token = await login(req, session)
    _set_refresh_cookie(response, refresh_token)
    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_route(
    request: Request,
    response: Response,
    session=Depends(get_session),
):
    raw = request.cookies.get("refresh_token")
    access_token, new_token = await refresh(raw, session)
    _set_refresh_cookie(response, new_token)
    return TokenResponse(access_token=access_token)


@router.post("/signout", status_code=204)
async def signout_route(
    request: Request,
    response: Response,
    session=Depends(get_session),
):
    raw = request.cookies.get("refresh_token")
    await signout(raw, session)
    _clear_refresh_cookie(response)


@router.post("/device/register", response_model=DeviceRegisterResponse, status_code=201)
async def device_register(
    req: DeviceRegisterRequest,
    session=Depends(get_session),
):
    return await register_device(req, session)


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
