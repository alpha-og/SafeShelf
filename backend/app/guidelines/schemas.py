from pydantic import BaseModel


class BootstrapResponse(BaseModel):
    version: str
    condition_thresholds: list
    ingredient_aliases: dict
    interaction_rules: list
