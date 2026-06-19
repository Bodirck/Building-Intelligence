"""POST /api/predict — classify one uploaded image and log the inspection."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone

from fastapi import APIRouter, File, HTTPException, UploadFile

from api.db.database import get_conn
from api.ml.classifier import classifier
from api.schemas import AnalysisResult

router = APIRouter()

MAX_BYTES = 12 * 1024 * 1024  # 12 MB upload ceiling


def _image_id(data: bytes) -> str:
    digest = hashlib.sha1(data).hexdigest()
    return "IMG-" + str(int(digest[:6], 16) % 9000 + 1000)


@router.post("/predict", response_model=AnalysisResult)
async def predict(file: UploadFile = File(...)) -> AnalysisResult:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds the 12 MB limit.")

    try:
        result = classifier.predict(data)
    except Exception as exc:  # decode / processing failure
        raise HTTPException(status_code=422, detail=f"Could not analyze the image: {exc}")

    image_id = _image_id(data)
    prediction = {
        "label": result["label"],
        "confidence": result["confidence"],
        "crack_probability": result["crack_probability"],
        "model": result["model"],
        "inference_ms": result["inference_ms"],
    }

    with get_conn() as conn:
        conn.execute(
            """INSERT INTO inspections
               (image_id, filename, label, confidence, crack_probability, model,
                features, created_at)
               VALUES (?,?,?,?,?,?,?,?)""",
            (
                image_id,
                file.filename,
                prediction["label"],
                prediction["confidence"],
                prediction["crack_probability"],
                prediction["model"],
                json.dumps(result["features"]),
                datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            ),
        )

    return AnalysisResult(
        image_id=image_id,
        filename=file.filename or "upload",
        captured_at=None,
        prediction=prediction,
        regions=result["regions"],
        defect_sheet=None,
    )
