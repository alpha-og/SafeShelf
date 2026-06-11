from fastapi import APIRouter, Depends

from app.analysis.schemas import CompareRequest, CompareResponse, EvaluateRequest, EvaluateResponse, SuggestRequest, SuggestResponse
from app.analysis.service import compare_products, evaluate_product, suggest_alternatives
from app.shared.deps import get_current_user, get_session

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate(
    req: EvaluateRequest,
    session=Depends(get_session),
    _current_user=Depends(get_current_user),
):
    return await evaluate_product(req, session)


@router.post("/compare", response_model=CompareResponse)
async def compare(
    req: CompareRequest,
    session=Depends(get_session),
    _current_user=Depends(get_current_user),
):
    return await compare_products(req, session)


@router.post("/suggest", response_model=SuggestResponse)
async def suggest(
    req: SuggestRequest,
    session=Depends(get_session),
    _current_user=Depends(get_current_user),
):
    return await suggest_alternatives(req, session)
