import logging
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger(__name__)

_EATING_OCCASIONS = 3

_PER_SERVING_MAX: dict[str, dict[str, float]] = {
    "fiber": {"g": 20},
    "sodium": {"mg": 3000},
    "salt": {"mg": 5000},
    "saturated_fat": {"g": 30},
    "trans_fat": {"g": 10},
    "sugars": {"g": 80},
    "added_sugars": {"g": 80},
    "protein": {"g": 80},
    "carbohydrates": {"g": 150},
    "fat": {"g": 80},
    "cholesterol": {"mg": 800},
    "energy": {"kcal": 1500},
}


class Rule(BaseModel):
    nutrient: str
    value: float
    operator: str
    unit: str

    @field_validator("operator")
    @classmethod
    def validate_operator(cls, v: str) -> str:
        allowed = {"le", "ge", "lt", "gt", "eq"}
        if v not in allowed:
            raise ValueError(f"Invalid operator '{v}'. Must be one of: {', '.join(sorted(allowed))}")
        return v

    @field_validator("unit")
    @classmethod
    def validate_unit(cls, v: str) -> str:
        allowed = {"g", "mg", "mcg", "%", "kcal", "kJ"}
        if v not in allowed:
            raise ValueError(f"Invalid unit '{v}'. Must be one of: {', '.join(sorted(allowed))}")
        return v

    @field_validator("value")
    @classmethod
    def sanitize_threshold(cls, v: float, info) -> float:
        nutrient = info.data.get("nutrient", "")
        unit = info.data.get("unit", "")
        operator = info.data.get("operator", "")
        if operator not in ("ge", "gt"):
            return v
        per_nutrient = _PER_SERVING_MAX.get(nutrient, {})
        max_val = per_nutrient.get(unit)
        if max_val is not None and v > max_val:
            corrected = round(v / _EATING_OCCASIONS, 1)
            logger.warning(
                "Rule %s: value %s%s likely daily, corrected to %s%s",
                nutrient, v, unit, corrected, unit,
            )
            return corrected
        return v


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


def sanitize_rules(rules: list[dict]) -> list[dict]:
    sanitized: list[dict] = []
    for r in rules:
        try:
            sanitized.append(Rule(**r).model_dump())
        except Exception as e:
            logger.warning("Skipping invalid rule %s: %s", r, e)
    return sanitized
