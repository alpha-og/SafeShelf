from pydantic import BaseModel


class EvaluateRequest(BaseModel):
    barcode: str
    profile_id: str | None = None


class EvaluateResponse(BaseModel):
    suitable: bool
    breakdown: dict
    insights: list[str] = []


class CompareRequest(BaseModel):
    barcodes: list[str]


class CompareResponse(BaseModel):
    rankings: list[dict]
    tradeoffs: list[str]


class SuggestRequest(BaseModel):
    barcode: str


class SuggestResponse(BaseModel):
    alternatives: list[dict]
    explanation: str | None = None


class DeepEvaluateRequest(BaseModel):
    product: dict
    user_profile: dict
    per_serving_nutrients: dict[str, dict[str, float | str]] = {}
    health_data: dict | None = None
    local_evaluation_result: dict | None = None


class DeepEvaluateResponse(BaseModel):
    checks: list[dict]
    agent_used: bool = True
