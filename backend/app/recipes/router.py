from fastapi import APIRouter, Depends

from app.recipes.schemas import SuggestRequest, SuggestResponse
from app.recipes.service import suggest_recipes
from app.shared.deps import get_current_user, get_session

router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.post("/suggest", response_model=SuggestResponse)
async def suggest(
    req: SuggestRequest,
    session=Depends(get_session),
    _current_user=Depends(get_current_user),
):
    return await suggest_recipes(req, session)
