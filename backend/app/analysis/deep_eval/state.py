from typing import Any, TypedDict


class AgentState(TypedDict):
    product: dict[str, Any]
    user_profile: dict[str, Any]
    per_serving_nutrients: dict[str, dict[str, Any]]

    disease_contexts: dict[str, str]
    personalized_rules: list[dict[str, Any]]

    nutrient_checks: list[dict[str, Any]]

    ingredient_checks: list[dict[str, Any]]
    ingredient_has_fails: bool

    med_interaction_checks: list[dict[str, Any]]

    final_checks: list[dict[str, Any]]
