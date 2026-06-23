from fastapi import APIRouter, Depends, Request, Response
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth.models import User
from app.auth.schemas import (
    DeviceRegisterRequest,
    DeviceRegisterResponse,
    SignInRequest,
    SignUpRequest,
    SignUpResponse,
    TokenResponse,
    UserResponse,
)
from app.auth.service import refresh, register_device, signin, signout, signup
from app.shared.config import settings
from app.shared.deps import get_current_user, get_session

router = APIRouter(prefix='/auth', tags=['auth'])

COOKIE_MAX_AGE = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key='refresh_token',
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite='none' if settings.COOKIE_SECURE else 'lax',
        max_age=COOKIE_MAX_AGE,
        path='/v1/auth',
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key='refresh_token', path='/v1/auth')


@router.post('/signup', response_model=SignUpResponse, status_code=201)
async def register(
    req: SignUpRequest,
    response: Response,
    session: AsyncSession = Depends(get_session),
):
    user, access_token, refresh_token = await signup(req, session)
    _set_refresh_cookie(response, refresh_token)
    return SignUpResponse(
        id=user.id,
        email=user.email,
        created_at=user.created_at,
        access_token=access_token,
    )


@router.post('/signin', response_model=TokenResponse)
async def signin_route(
    req: SignInRequest,
    response: Response,
    session: AsyncSession = Depends(get_session),
):
    access_token, refresh_token = await signin(req, session)
    _set_refresh_cookie(response, refresh_token)
    return TokenResponse(access_token=access_token)


@router.post('/refresh', response_model=TokenResponse)
async def refresh_route(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
):
    raw = request.cookies.get('refresh_token')
    access_token, new_token = await refresh(raw, session)
    _set_refresh_cookie(response, new_token)
    return TokenResponse(access_token=access_token)


@router.post('/signout', status_code=204)
async def signout_route(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
):
    raw = request.cookies.get('refresh_token')
    await signout(raw, session)
    _clear_refresh_cookie(response)


@router.post('/device/register', response_model=DeviceRegisterResponse, status_code=201)
async def device_register(
    req: DeviceRegisterRequest,
    session: AsyncSession = Depends(get_session),
):
    return await register_device(req, session)


@router.get('/me', response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
