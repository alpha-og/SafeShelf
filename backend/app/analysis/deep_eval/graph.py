from langgraph.graph import END, StateGraph

from app.analysis.deep_eval.nodes import (
    ingredient_evaluation,
    medication_interaction_node,
    nutrient_check,
    output_aggregator,
    profile_builder,
)
from app.analysis.deep_eval.state import AgentState


def route_after_ingredient(state: AgentState) -> str:
    profile = state.get("user_profile") or {}
    medications = profile.get("medications", [])
    if medications:
        return "medication_interaction"
    return "output_aggregator"


def build_graph():
    builder = StateGraph(AgentState)

    builder.add_node("profile_builder", profile_builder)
    builder.add_node("nutrient_check", nutrient_check)
    builder.add_node("ingredient_evaluation", ingredient_evaluation)
    builder.add_node("medication_interaction", medication_interaction_node)
    builder.add_node("output_aggregator", output_aggregator)

    builder.set_entry_point("profile_builder")

    builder.add_edge("profile_builder", "nutrient_check")
    builder.add_edge("nutrient_check", "ingredient_evaluation")
    builder.add_conditional_edges(
        "ingredient_evaluation",
        route_after_ingredient,
        {
            "medication_interaction": "medication_interaction",
            "output_aggregator": "output_aggregator",
        }
    )
    builder.add_edge("medication_interaction", "output_aggregator")
    builder.add_edge("output_aggregator", END)

    return builder.compile()
