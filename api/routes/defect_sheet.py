"""POST /api/defect-sheet — generate the structured sheet for a cracked image.

Reads the crack features stored at /predict time (keyed by image_id) so the LLM
gets the orientation / width / location signals."""
from __future__ import annotations

import json

from fastapi import APIRouter

from api.db.database import get_conn
from api.llm.defect_sheet import generate_defect_sheet
from api.schemas import DefectSheetRequest, DefectSheetResponse

router = APIRouter()


def _load(image_id: str) -> tuple[dict, str | None]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT features, filename FROM inspections WHERE image_id = ? ORDER BY id DESC LIMIT 1",
            (image_id,),
        ).fetchone()
    if not row:
        return {}, None
    try:
        features = json.loads(row["features"]) if row["features"] else {}
    except (ValueError, TypeError):
        features = {}
    return features, row["filename"]


@router.post("/defect-sheet", response_model=DefectSheetResponse)
def defect_sheet(req: DefectSheetRequest) -> DefectSheetResponse:
    features, filename = _load(req.image_id)
    sheet = generate_defect_sheet(req.image_id, req.prediction.model_dump(), features, filename)

    if sheet is not None:
        with get_conn() as conn:
            conn.execute(
                "UPDATE inspections SET severity = ?, crack_type = ? WHERE image_id = ?",
                (sheet["severity"], sheet["crack_type"], req.image_id),
            )

    return DefectSheetResponse(defect_sheet=sheet)
