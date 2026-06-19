"""Prompt + structured-output tool for the defect-sheet LLM."""
from __future__ import annotations

CRACK_TYPES = [
    "Flexural crack (transverse)",
    "Shear crack (diagonal)",
    "Corrosion-induced longitudinal crack",
    "Map cracking (craquelure)",
    "Plastic shrinkage crack",
    "Thermal / restraint crack",
    "Other",
]

SYSTEM = (
    "You are a structural-engineering assistant for SECO, an independent technical "
    "control body in Luxembourg/Belgium. From automated concrete crack-inspection "
    "signals you draft a concise, defensible defect sheet for a field inspector. "
    "You are decisive but honest about uncertainty: the inputs are an image-based "
    "classifier plus coarse geometric features, not a calibrated measurement. Always "
    "ground severity and recommendations in Eurocode 2 (EN 1992-1-1) and related EN "
    "standards (EN 1504 for repair, EN 206 for durability, EN 13670 for execution). "
    "Crack width drives serviceability checks (EN 1992-1-1 §7.3). Respond ONLY by "
    "calling the emit_defect_sheet tool."
)

# JSON schema for the forced tool call. The backend fills defect_id / confidence /
# generated_by itself; the model fills the engineering content.
DEFECT_TOOL = {
    "name": "emit_defect_sheet",
    "description": "Emit the structured concrete-crack defect sheet.",
    "input_schema": {
        "type": "object",
        "properties": {
            "crack_type": {"type": "string", "enum": CRACK_TYPES,
                           "description": "Most likely crack typology given the signals."},
            "severity": {"type": "string", "enum": ["critical", "major", "minor"]},
            "structural_element": {"type": "string",
                                   "description": "Likely element, e.g. 'Deck slab', 'Pier', 'Retaining wall'."},
            "location": {"type": "string",
                         "description": "Short location phrase from the region/orientation hints."},
            "width_mm": {"type": "number",
                         "description": "Estimated crack width in mm (best estimate; note it is indicative)."},
            "recommendation": {"type": "string",
                               "description": "One actionable recommendation for the inspector / asset manager."},
            "normative_reference": {"type": "string",
                                    "description": "Specific Eurocode / EN clause, e.g. 'Eurocode 2 (EN 1992-1-1) §7.3.1'."},
            "severity_rationale": {"type": "string", "description": "One line justifying the severity."},
            "summary": {"type": "string", "description": "One-sentence summary of the finding."},
        },
        "required": [
            "crack_type", "severity", "structural_element", "location", "width_mm",
            "recommendation", "normative_reference", "severity_rationale", "summary",
        ],
    },
}


def build_user_prompt(prediction: dict, features: dict, filename: str | None) -> str:
    return (
        "Automated inspection signals for one concrete surface image:\n"
        f"- classifier: {prediction.get('model')}\n"
        f"- verdict: {prediction.get('label')} "
        f"(crack probability {prediction.get('crack_probability')}, "
        f"confidence {prediction.get('confidence')})\n"
        f"- crack-pixel coverage: {features.get('coverage')}\n"
        f"- dominant orientation: {features.get('orientation_deg')} deg "
        "(0/180 = horizontal, 90 = vertical, ~45/135 = diagonal)\n"
        f"- relative width proxy: {features.get('width_px')} (px units on a 256px image)\n"
        f"- region location on the image: {features.get('location')}\n"
        f"- source file: {filename or 'n/a'}\n\n"
        "Draft the defect sheet. If signals are weak or contradictory, prefer a lower "
        "severity and say so in the rationale."
    )
