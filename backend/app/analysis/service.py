import json

from fastapi import HTTPException, status
from fastapi.responses import StreamingResponse

from app.analysis.deep_eval.graph import build_graph
from app.analysis.schemas import (
    CompareRequest,
    DeepEvaluateRequest,
    EvaluateRequest,
    SuggestRequest,
)


async def evaluate_product(req: EvaluateRequest, session) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail='Not implemented')


async def compare_products(req: CompareRequest, session) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail='Not implemented')


async def suggest_alternatives(req: SuggestRequest, session) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail='Not implemented')


_graph_instance = None


def _get_graph():
    global _graph_instance
    if _graph_instance is None:
        _graph_instance = build_graph()
    return _graph_instance


async def deep_evaluate(req: DeepEvaluateRequest) -> StreamingResponse:
    async def event_generator():
        # Yield initial phases
        bm_evt = {"event": "phase", "phase": "basic_metrics", "status": "pass"}
        yield f"data: {json.dumps(bm_evt)}\n\n"
        ia_evt = {"event": "phase", "phase": "ingredient_analysis", "status": "running"}
        yield f"data: {json.dumps(ia_evt)}\n\n"
        mc_evt = {"event": "phase", "phase": "medication_check", "status": "pending"}
        yield f"data: {json.dumps(mc_evt)}\n\n"

        graph = _get_graph()
        initial_state = {
            "product": req.product,
            "user_profile": req.user_profile,
            "per_serving_nutrients": req.per_serving_nutrients,
            "health_data": req.health_data,
            "local_evaluation_result": req.local_evaluation_result,
            "disease_contexts": {},
            "personalized_rules": [],
            "nutrient_checks": [],
            "ingredient_checks": [],
            "ingredient_has_fails": False,
            "med_interaction_checks": [],
            "final_checks": [],
        }

        has_meds = bool(req.user_profile.get("medications"))
        if req.health_data:
            pd = req.health_data.get("personalDetails")
            if isinstance(pd, dict) and pd.get("medications"):
                has_meds = True
            elif req.health_data.get("medications"):
                has_meds = True

        final_state = initial_state.copy()

        try:
            async for event in graph.astream(initial_state, stream_mode="updates"):
                for node_name, node_output in event.items():
                    # Accumulate updates
                    final_state.update(node_output)

                    # Handle inner error payloads passed from fast-fail nodes
                    if "error" in node_output:
                        yield f"data: {json.dumps({'event': 'error', 'detail': node_output['error'].get('detail', 'AI limit reached')})}\n\n"
                        return

                    # Update has_meds if profile_builder found them and updated user_profile
                    if node_name == "profile_builder":
                        profile_updated = node_output.get("user_profile", {})
                        if profile_updated.get("medications"):
                            has_meds = True
                        
                        rules = node_output.get("personalized_rules", [])
                        conditions = initial_state["user_profile"].get("conditions", [])
                        if conditions:
                            summary = f"Guidelines loaded for {', '.join(conditions)}. {len(rules)} personalized rule(s) extracted."
                        else:
                            summary = "General wellness guidelines applied."

                        yield f"data: {json.dumps({
                            'event': 'phase',
                            'phase': 'basic_metrics',
                            'status': 'pass',
                            'summary': summary
                        })}\n\n"

                    elif node_name == "nutrient_check":
                        checks = node_output.get("nutrient_checks", [])
                        has_fails = len(checks) > 0
                        if has_fails:
                            summary = f"Flagged {len(checks)} personalized nutrient guideline conflict(s)."
                        else:
                            summary = "Verified all personalized nutrient limits (sodium, saturated fat, sugar, etc.). All clear."

                        yield f"data: {json.dumps({
                            'event': 'phase',
                            'phase': 'basic_metrics',
                            'status': 'fail' if has_fails else 'pass',
                            'summary': summary
                        })}\n\n"

                    elif node_name == "ingredient_evaluation":
                        checks = node_output.get("ingredient_checks", [])
                        has_fails = node_output.get("ingredient_has_fails", False)
                        
                        if has_fails:
                            summary = f"Flagged {len(checks)} potential ingredient risk(s)/conflict(s)."
                        else:
                            summary = "Successfully evaluated raw ingredients. No allergen derivatives or medical exclusions found."

                        yield f"data: {json.dumps({
                            'event': 'phase',
                            'phase': 'ingredient_analysis',
                            'status': 'fail' if has_fails else 'pass',
                            'summary': summary
                        })}\n\n"
                        
                        if has_meds:
                            yield f"data: {json.dumps({
                                'event': 'phase',
                                'phase': 'medication_check',
                                'status': 'running',
                                'summary': 'Analyzing drug-nutrient interactions...'
                            })}\n\n"
                        else:
                            yield f"data: {json.dumps({
                                'event': 'phase',
                                'phase': 'medication_check',
                                'status': 'pass',
                                'summary': 'No medications reported; drug interaction check skipped.'
                            })}\n\n"

                    elif node_name == "medication_interaction":
                        checks = node_output.get("med_interaction_checks", [])
                        has_fails = any(c.get("status") == "fail" for c in checks)
                        meds = initial_state["user_profile"].get("medications", [])
                        
                        if checks:
                            summary = f"Flagged {len(checks)} potential interaction risk(s) for medications: {', '.join(meds)}."
                        else:
                            summary = f"Successfully cross-referenced medications ({', '.join(meds)}) with ingredients. No interactions found."

                        yield f"data: {json.dumps({
                            'event': 'phase',
                            'phase': 'medication_check',
                            'status': 'fail' if has_fails else 'pass',
                            'summary': summary
                        })}\n\n"

            # Yield final result payload
            final_checks = final_state.get("final_checks", [])
            result_payload = {
                "event": "result",
                "checks": final_checks,
                "agent_used": True,
            }
            yield f"data: {json.dumps(result_payload)}\n\n"

        except Exception as e:
            # Yield error event so the frontend is notified
            status_code = 500
            err_str = str(e)
            if "429" in err_str or "rate limit" in err_str.lower() or "too many requests" in err_str.lower():
                status_code = 429
            elif "403" in err_str or "forbidden" in err_str.lower() or "authentication" in err_str.lower() or "api key" in err_str.lower():
                status_code = 403
            err_payload = {"event": "error", "detail": err_str, "status": status_code}
            yield f"data: {json.dumps(err_payload)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
