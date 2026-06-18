from langgraph.graph import END, StateGraph

from app.analysis.deep_eval.nodes import (
    nutrient_check,
    output_aggregator,
    parallel_evaluation,
    profile_builder,
)
from app.analysis.deep_eval.state import AgentState


def build_graph():
    builder = StateGraph(AgentState)

    builder.add_node("profile_builder", profile_builder)
    builder.add_node("nutrient_check", nutrient_check)
    builder.add_node("parallel_evaluation", parallel_evaluation)
    builder.add_node("output_aggregator", output_aggregator)

    builder.set_entry_point("profile_builder")

    builder.add_edge("profile_builder", "nutrient_check")
    builder.add_edge("nutrient_check", "parallel_evaluation")
    builder.add_edge("parallel_evaluation", "output_aggregator")
    builder.add_edge("output_aggregator", END)

    return builder.compile()
