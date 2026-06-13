from datetime import datetime

from pydantic import BaseModel, Field


class Rule(BaseModel):
    nutrient: str
    value: float
    operator: str
    unit: str


class GuidelineEntrySchema(BaseModel):
    rules: list[Rule] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    exclusions: list[str] = Field(default_factory=list)
    interaction_rules: list[dict] = Field(default_factory=list)
    source: str | None = None


class ConditionThresholdSchema(BaseModel):
    disease: str
    code: str = "UNKNOWN"
    entries: list[GuidelineEntrySchema] = Field(default_factory=list)
    version: str = "1.0"
    created_at: datetime | None = None


class BootstrapResponse(BaseModel):
    version: str
    condition_thresholds: list[ConditionThresholdSchema]
    ingredient_aliases: dict[str, str]


class GuidelineResponse(ConditionThresholdSchema):
    id: int


class GuidelineListResponse(BaseModel):
    guidelines: list[GuidelineResponse]
    count: int


class ImportResponse(BaseModel):
    imported: list[str]
    count: int
