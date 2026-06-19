"""Building Intelligence API — FastAPI app.

Run from the repo root:
    uvicorn api.main:app --reload --port 8000

Endpoints (all under /api):
    GET  /api/meta          identity + active classifier / LLM provider
    POST /api/predict       crack / no-crack classification for one image
    POST /api/defect-sheet  structured defect sheet for a cracked image
    GET  /api/portfolio     portfolio KPIs + structures
    GET  /api/health        liveness probe
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import APP_NAME, APP_VERSION, CORS_ORIGINS
from api.db.seed import seed_if_empty
from api.routes import defect_sheet, meta, portfolio, predict


@asynccontextmanager
async def lifespan(_app: FastAPI):
    seed_if_empty()
    yield


app = FastAPI(title=APP_NAME, version=APP_VERSION, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meta.router, prefix="/api")
app.include_router(predict.router, prefix="/api")
app.include_router(defect_sheet.router, prefix="/api")
app.include_router(portfolio.router, prefix="/api")


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "app": APP_NAME, "version": APP_VERSION}
