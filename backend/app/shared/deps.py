from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from jose import jwt
from jose.exceptions import JWTError
from sqlmodel import select

from app.auth.models import User
from app.shared.config import settings
from app.shared.db import get_session

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials=Depends(bearer_scheme),
    session=Depends(get_session),
) -> User:
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await session.exec(select(User).where(User.id == int(user_id)))
    user = result.first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user
