"""GET /api/meta — identity + the engines actually in effect (surfaced as a chip)."""
from __future__ import annotations

from fastapi import APIRouter

from api.config import ANTHROPIC_API_KEY, APP_NAME, APP_VERSION
from api.ml.classifier import classifier
from api.schemas import Meta

router = APIRouter()


@router.get("/meta", response_model=Meta)
def meta() -> Meta:
    return Meta(
        app=APP_NAME,
        version=APP_VERSION,
        provider="anthropic" if ANTHROPIC_API_KEY else "mock",
        classifier=classifier.model_name,
    )
