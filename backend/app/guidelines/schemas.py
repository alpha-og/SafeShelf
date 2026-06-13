from datetime import datetime

from pydantic import BaseModel


class Rule(BaseModel):
    nutrient: str
    value: float
    operator: str
    unit: str


class ConditionThresholdSchema(BaseModel):
    disease: str
    rules: list[Rule]
    recommendations: list[str] = []
    exclusions: list[str] = []
    interaction_rules: list[dict] = []


class BootstrapResponse(BaseModel):
    version: str
    condition_thresholds: list[ConditionThresholdSchema]
    ingredient_aliases: dict[str, str]


class GuidelineResponse(ConditionThresholdSchema):
    id: int
    source: str | None = None
    version: str
    created_at: datetime | None = None


class GuidelineListResponse(BaseModel):
    guidelines: list[GuidelineResponse]
    count: int


class ImportResponse(BaseModel):
    imported: list[str]
    count: int
