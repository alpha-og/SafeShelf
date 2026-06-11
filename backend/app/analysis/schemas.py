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
