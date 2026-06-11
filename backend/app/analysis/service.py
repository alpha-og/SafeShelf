from fastapi import HTTPException, status

from app.analysis.schemas import CompareRequest, EvaluateRequest, SuggestRequest


async def evaluate_product(req: EvaluateRequest, session) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented")


async def compare_products(req: CompareRequest, session) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented")


async def suggest_alternatives(req: SuggestRequest, session) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented")
