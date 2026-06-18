import asyncio
import json
import logging

from langchain_core.messages import HumanMessage, SystemMessage
from app.analysis.deep_eval.prompts import (
    INGREDIENT_EVALUATOR_PROMPT,
    MEDICATION_INTERACTION_PROMPT,
    PROFILE_BUILDER_PROMPT,
)
from app.analysis.deep_eval.state import AgentState
from app.guidelines.agent import llm
from app.guidelines.embeddings import retrieve_disease_context

logger = logging.getLogger(__name__)

NUTRIENT_KEY_MAP: dict[str, list[str]] = {
    "sodium": ["sodium"],
    "salt": ["salt"],
    "saturated_fat": ["saturated_fat", "saturated-fat", "saturated fat"],
    "trans_fat": ["trans_fat", "trans-fat", "trans fat"],
    "added_sugars": ["added_sugars", "added-sugars", "added sugars"],
    "sugars": ["sugars", "sugar"],
    "fiber": ["fiber", "dietary_fiber", "dietary-fiber", "dietary fiber"],
    "fat": ["fat", "total_fat", "total-fat", "total fat"],
    "carbohydrates": ["carbohydrates", "carbs"],
    "protein": ["protein", "proteins"],
    "energy": ["energy", "energy-kcal", "energy_kcal"],
    "cholesterol": ["cholesterol"],
}


def _normalize_nutrient(name: str) -> str:
    lower = name.lower().replace(" ", "_")
    for canonical, variants in NUTRIENT_KEY_MAP.items():
        if lower == canonical or lower in variants:
            return canonical
    return lower


async def profile_builder(state: AgentState) -> dict:
    profile = state["user_profile"]
    conditions = profile.get("conditions", [])
    condition_codes = profile.get("conditionCodes", [])
    age = profile.get("age")
    severities = profile.get("diseaseSeverities", {})
    medications = profile.get("medications", [])

    if not conditions:
        return {"disease_contexts": {}, "personalized_rules": []}

    disease_contexts: dict[str, str] = {}
    disease_info: list[dict] = []

    for i, name in enumerate(conditions):
        code = condition_codes[i] if i < len(condition_codes) else "UNKNOWN"
        severity = severities.get(code, severities.get(name, "moderate"))
        try:
            ctx = await retrieve_disease_context(name)
        except Exception:
            logger.warning("Failed to retrieve context for disease: %s", name)
            ctx = ""
        disease_contexts[code] = ctx

        disease_info.append({
            "disease": name,
            "code": code,
            "severity": severity,
        })

    context_parts = []
    for d in disease_info:
        ctx = disease_contexts.get(d["code"], "")
        context_parts.append(f"DISEASE: {d['disease']} (code: {d['code']})\nCONTEXT:\n{ctx}")
    all_contexts = "\n\n---\n\n".join(context_parts)

    user_info_parts = []
    if age is not None:
        user_info_parts.append(f"Age: {age}")
    severity_parts = [f"{d['disease']} ({d['code']}): {d['severity']}" for d in disease_info]
    user_info_parts.append(f"Disease severities: {', '.join(severity_parts)}")
    if medications:
        user_info_parts.append(f"Medications: {', '.join(medications)}")
    user_info_str = "\n".join(user_info_parts)

    human_content = (
        f"USER INFO:\n{user_info_str}\n\n"
        f"DISEASE CONTEXTS:\n{all_contexts}"
    )

    response = await llm.ainvoke([
        SystemMessage(content=PROFILE_BUILDER_PROMPT),
        HumanMessage(content=human_content),
    ])

    content = response.content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1]
        content = content.rsplit("```", 1)[0]

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        logger.error("LLM returned invalid JSON: %s", content)
        return {"disease_contexts": disease_contexts, "personalized_rules": []}

    rules = parsed.get("conditions", [])
    for condition in rules:
        for rule in condition.get("rules", []):
            rule["nutrient"] = _normalize_nutrient(rule.get("nutrient", ""))
    return {"disease_contexts": disease_contexts, "personalized_rules": rules}


def _convert_unit(value: float, from_unit: str, to_unit: str) -> float:
    if from_unit == to_unit:
        return value
    conversions = [
        ("g", "mg", 1000),
        ("g", "mcg", 1_000_000),
        ("mg", "g", 1 / 1000),
        ("mg", "mcg", 1000),
        ("mcg", "g", 1 / 1_000_000),
        ("mcg", "mg", 1 / 1000),
        ("kcal", "kJ", 4.184),
        ("kJ", "kcal", 1 / 4.184),
    ]
    for frm, to, factor in conversions:
        if from_unit == frm and to_unit == to:
            return value * factor
    raise ValueError(f"Cannot convert {from_unit} to {to_unit}")


def _apply_operator(value: float, threshold: float, operator: str) -> bool:
    if operator == "le":
        return value <= threshold
    elif operator == "ge":
        return value >= threshold
    elif operator == "lt":
        return value < threshold
    elif operator == "gt":
        return value > threshold
    elif operator == "eq":
        return abs(value - threshold) < 0.001
    return True


def nutrient_check(state: AgentState) -> dict:
    pn_raw = state.get("per_serving_nutrients", {})
    pn = {_normalize_nutrient(k): v for k, v in pn_raw.items()}
    rules_list = state.get("personalized_rules", [])
    checks: list[dict] = []

    for condition in rules_list:
        disease = condition.get("disease", "Unknown")
        code = condition.get("code", "")
        for rule in condition.get("rules", []):
            nutrient = rule.get("nutrient")
            threshold = rule.get("value")
            op = rule.get("operator")
            unit = rule.get("unit")
            reason = rule.get("reason", "")

            if not nutrient or nutrient not in pn:
                continue

            pv = pn[nutrient]
            pv_value = pv.get("value", 0)
            pv_unit = pv.get("unit", "g")

            try:
                if pv_unit != unit:
                    pv_value = _convert_unit(pv_value, pv_unit, unit)
            except ValueError:
                continue

            meets = _apply_operator(pv_value, threshold, op)
            if not meets:
                if op in ("le", "lt"):
                    violation = "exceeds"
                    phrase = f"exceeds the limit of"
                elif op in ("ge", "gt"):
                    violation = "below minimum"
                    phrase = f"is below the minimum of"
                else:
                    violation = "does not match"
                    phrase = f"does not match the target of"
                label = f"{nutrient.capitalize().replace('_', ' ')} {violation}"
                detail = (
                    f"{pv_value:.1f}{unit}/serving {phrase} "
                    f"{threshold}{unit} for {disease} — {reason}"
                )
                checks.append({
                    "type": "agent_insight",
                    "status": "fail",
                    "label": label,
                    "detail": detail,
                    "group": f"{disease} (Personalized)",
                })

    return {"nutrient_checks": checks}


async def _run_ingredient_eval(state: AgentState) -> dict:
    product = state["product"]
    profile = state["user_profile"]
    rules_list = state.get("personalized_rules", [])

    ingredients = product.get("ingredients", [])
    allergens = profile.get("allergens", [])
    dietary_preferences = profile.get("dietaryPreferences", [])

    all_exclusions = set()
    for condition in rules_list:
        all_exclusions.update(e.lower() for e in condition.get("exclusions", []))

    if not ingredients:
        return {"ingredient_checks": [], "ingredient_has_fails": False}

    human_content = (
        f"INGREDIENTS:\n{', '.join(ingredients) if ingredients else '(none)'}\n\n"
        f"ALLERGENS:\n{', '.join(allergens) if allergens else '(none)'}\n\n"
        f"DIETARY PREFERENCES:\n{', '.join(dietary_preferences) if dietary_preferences else '(none)'}\n\n"
        f"MEDICAL EXCLUSIONS:\n{', '.join(sorted(all_exclusions)) if all_exclusions else '(none)'}"
    )

    response = await llm.ainvoke([
        SystemMessage(content=INGREDIENT_EVALUATOR_PROMPT),
        HumanMessage(content=human_content),
    ])

    content = response.content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1]
        content = content.rsplit("```", 1)[0]

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        logger.error("Ingredient evaluator LLM returned invalid JSON: %s", content)
        return {"ingredient_checks": [], "ingredient_has_fails": False}

    checks = parsed.get("checks", [])
    has_fails = any(c.get("status") == "fail" for c in checks)

    return {"ingredient_checks": checks, "ingredient_has_fails": has_fails}


async def _run_medication_interaction(state: AgentState) -> dict:
    profile = state["user_profile"]
    product = state["product"]
    rules_list = state.get("personalized_rules", [])

    medications = profile.get("medications", [])
    if not medications:
        return {"med_interaction_checks": []}

    all_interaction_rules = []
    for condition in rules_list:
        all_interaction_rules.extend(condition.get("interaction_rules", []))

    nutrients = product.get("nutrients", {})
    ingredients = product.get("ingredients", [])

    nutrients_preview = {}
    for k in list(nutrients.keys())[:15]:
        nutrients_preview[k] = nutrients[k]

    human_content = (
        f"MEDICATIONS:\n{', '.join(medications)}\n\n"
        f"INTERACTION RULES:\n{json.dumps(all_interaction_rules, indent=2)}\n\n"
        f"PRODUCT NUTRIENTS (per 100g):\n{json.dumps(nutrients_preview, indent=2)}\n\n"
        f"PRODUCT INGREDIENTS:\n{', '.join(ingredients) if ingredients else '(none)'}"
    )

    response = await llm.ainvoke([
        SystemMessage(content=MEDICATION_INTERACTION_PROMPT),
        HumanMessage(content=human_content),
    ])

    content = response.content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1]
        content = content.rsplit("```", 1)[0]

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        logger.error("Medication interaction LLM returned invalid JSON: %s", content)
        return {"med_interaction_checks": []}

    checks = parsed.get("checks", [])
    return {"med_interaction_checks": checks}


async def parallel_evaluation(state: AgentState) -> dict:
    tasks = [_run_ingredient_eval(state)]

    medications = state.get("user_profile", {}).get("medications", [])
    if medications:
        tasks.append(_run_medication_interaction(state))

    results = await asyncio.gather(*tasks)

    state_update = dict(results[0])

    if len(results) > 1:
        med_result = results[1]
        state_update["med_interaction_checks"] = med_result.get("med_interaction_checks", [])

    return state_update


def output_aggregator(state: AgentState) -> dict:
    all_checks: list[dict] = []

    all_checks.extend(state.get("nutrient_checks", []))
    all_checks.extend(state.get("ingredient_checks", []))
    all_checks.extend(state.get("med_interaction_checks", []))

    seen = set()
    deduped = []
    for c in all_checks:
        key = (c.get("label", ""), c.get("detail", ""))
        if key not in seen:
            seen.add(key)
            deduped.append(c)

    return {"final_checks": deduped}
