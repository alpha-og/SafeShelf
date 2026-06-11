from fastapi import HTTPException, status

from app.recipes.schemas import SuggestRequest


async def suggest_recipes(req: SuggestRequest, session) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented")
