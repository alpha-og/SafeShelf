from fastapi import HTTPException, status

from app.analysis.schemas import (
    CompareRequest,
    DeepEvaluateRequest,
    DeepEvaluateResponse,
    EvaluateRequest,
    SuggestRequest,
)
from app.analysis.deep_eval.graph import build_graph


async def evaluate_product(req: EvaluateRequest, session) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail='Not implemented')


async def compare_products(req: CompareRequest, session) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail='Not implemented')


async def suggest_alternatives(req: SuggestRequest, session) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail='Not implemented')


_graph_instance = None


def _get_graph():
    global _graph_instance
    if _graph_instance is None:
        _graph_instance = build_graph()
    return _graph_instance


async def deep_evaluate(req: DeepEvaluateRequest) -> DeepEvaluateResponse:
    graph = _get_graph()
    initial_state = {
        "product": req.product,
        "user_profile": req.user_profile,
        "per_serving_nutrients": req.per_serving_nutrients,
        "disease_contexts": {},
        "personalized_rules": [],
        "nutrient_checks": [],
        "ingredient_checks": [],
        "ingredient_has_fails": False,
        "med_interaction_checks": [],
        "final_checks": [],
    }
    result = await graph.ainvoke(initial_state)
    return DeepEvaluateResponse(
        checks=result.get("final_checks", []),
        agent_used=True,
    )
