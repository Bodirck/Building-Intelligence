"""Generate the structured defect sheet.

Primary path: Anthropic claude-sonnet-4-6 with a forced tool call (structured
output). Fallback path: a deterministic, feature-driven generator so the product
works fully with no API key. Either way the output validates against schemas.DefectSheet."""
from __future__ import annotations

from api.config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL
from api.llm.prompts import DEFECT_TOOL, SYSTEM, build_user_prompt

_VALID_SEVERITY = {"critical", "major", "minor"}


def _defect_id(image_id: str) -> str:
    return image_id.replace("IMG-", "DFT-") if image_id.startswith("IMG-") else f"DFT-{image_id}"


def _sheet_confidence(prediction: dict) -> float:
    # The sheet is never more confident than the classifier; trim a little.
    return round(min(0.98, float(prediction.get("confidence", 0.8)) * 0.95 + 0.02), 3)


def generate_defect_sheet(
    image_id: str,
    prediction: dict,
    features: dict,
    filename: str | None = None,
) -> dict | None:
    """Return a DefectSheet dict, or None if the image is not cracked."""
    if prediction.get("label") != "crack":
        return None

    if ANTHROPIC_API_KEY:
        try:
            return _generate_llm(image_id, prediction, features, filename)
        except Exception:
            # Any SDK / network / parsing failure -> deterministic fallback.
            pass
    return _generate_fallback(image_id, prediction, features)


def _generate_llm(image_id, prediction, features, filename) -> dict:
    import anthropic

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    msg = client.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=1000,
        system=SYSTEM,
        tools=[DEFECT_TOOL],
        tool_choice={"type": "tool", "name": "emit_defect_sheet"},
        messages=[{"role": "user", "content": build_user_prompt(prediction, features, filename)}],
    )
    payload = None
    for block in msg.content:
        if getattr(block, "type", None) == "tool_use" and block.name == "emit_defect_sheet":
            payload = block.input
            break
    if not payload:
        raise ValueError("model did not return the defect-sheet tool call")

    severity = payload.get("severity")
    if severity not in _VALID_SEVERITY:
        severity = "minor"
    width = payload.get("width_mm")
    return {
        "defect_id": _defect_id(image_id),
        "crack_type": str(payload.get("crack_type", "Other")),
        "severity": severity,
        "severity_rationale": str(payload.get("severity_rationale", "")),
        "structural_element": str(payload.get("structural_element", "Concrete element")),
        "location": str(payload.get("location", features.get("location", "n/a"))),
        "width_mm": round(float(width), 2) if isinstance(width, (int, float)) else None,
        "recommendation": str(payload.get("recommendation", "")),
        "normative_reference": str(payload.get("normative_reference", "Eurocode 2 (EN 1992-1-1)")),
        "summary": str(payload.get("summary", "")),
        "confidence": _sheet_confidence(prediction),
        "generated_by": "llm",
    }


# --- Deterministic fallback ------------------------------------------------

_TEMPLATES = {
    "shear": {
        "crack_type": "Shear crack (diagonal)",
        "severity": "critical",
        "structural_element": "Web / support region",
        "recommendation": "Restrict load and commission a structural assessment; diagonal cracking near supports can indicate a shear-capacity shortfall. Monitor width with crack gauges.",
        "normative_reference": "Eurocode 2 (EN 1992-1-1) §6.2 (shear) & §7.3.1 (crack width)",
        "severity_rationale": "Diagonal orientation in a shear-critical zone is treated as structurally significant.",
        "width_mm": 0.6,
    },
    "thermal": {
        "crack_type": "Thermal / restraint crack",
        "severity": "major",
        "structural_element": "Retaining wall / abutment",
        "recommendation": "Confirm the crack is dormant and seal against water ingress; early-age restraint cracking is common but a durability path if left open.",
        "normative_reference": "Eurocode 2 (EN 1992-1-1) §7.3 (early-age cracking) + EN 206",
        "severity_rationale": "Near-vertical through-section crack at a restraint point; durability-driven rather than strength-driven.",
        "width_mm": 0.4,
    },
    "flexural": {
        "crack_type": "Flexural crack (transverse)",
        "severity": "major",
        "structural_element": "Deck slab — tension face",
        "recommendation": "Record width and schedule re-inspection; verify the width stays within the Eurocode limit for the exposure class.",
        "normative_reference": "Eurocode 2 (EN 1992-1-1) §7.3.1 (w_max for exposure class)",
        "severity_rationale": "Horizontal/transverse orientation on a tension face is typical of flexure near the serviceability limit.",
        "width_mm": 0.3,
    },
    "map": {
        "crack_type": "Map cracking (craquelure)",
        "severity": "minor",
        "structural_element": "Surface concrete / facing",
        "recommendation": "Cosmetic / durability watch item; record and review at the next routine inspection.",
        "normative_reference": "Eurocode 2 (EN 1992-1-1) §7.3.1 + EN 206 (durability)",
        "severity_rationale": "Shallow, diffuse, sub-0.2 mm surface pattern with no structural implication at this stage.",
        "width_mm": 0.12,
    },
}


def _pick_template(features: dict) -> dict:
    coverage = features.get("coverage") or 0.0
    orient = features.get("orientation_deg")
    if coverage < 0.008 or orient is None:
        return _TEMPLATES["map"]
    if 30 <= orient <= 60 or 120 <= orient <= 150:
        return _TEMPLATES["shear"]
    if 70 <= orient <= 110:
        return _TEMPLATES["thermal"]
    if orient <= 20 or orient >= 160:
        return _TEMPLATES["flexural"]
    return _TEMPLATES["map"]


def _generate_fallback(image_id, prediction, features) -> dict:
    tpl = _pick_template(features)
    loc = features.get("location", "n/a")
    return {
        "defect_id": _defect_id(image_id),
        "crack_type": tpl["crack_type"],
        "severity": tpl["severity"],
        "severity_rationale": tpl["severity_rationale"],
        "structural_element": tpl["structural_element"],
        "location": f"Region: {loc}" if loc and loc != "n/a" else "Region of interest on the analyzed face",
        "width_mm": tpl["width_mm"],
        "recommendation": tpl["recommendation"],
        "normative_reference": tpl["normative_reference"],
        "summary": f"{tpl['crack_type']} detected; severity {tpl['severity']}.",
        "confidence": _sheet_confidence(prediction),
        "generated_by": "mock",
    }
