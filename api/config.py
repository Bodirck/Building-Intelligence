"""Central configuration. Paths resolve relative to the repo root so the API runs
from any working directory; secrets come from api/.env (git-ignored)."""
from __future__ import annotations

import os
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:  # dotenv is optional; env vars still work without it
    load_dotenv = None

API_DIR = Path(__file__).resolve().parent
ROOT_DIR = API_DIR.parent

if load_dotenv is not None:
    load_dotenv(API_DIR / ".env")

# Storage
DB_PATH = Path(os.getenv("BI_DB_PATH", str(ROOT_DIR / "data" / "app.db")))

# Model — if a trained classifier is present it is used; otherwise the baseline.
MODEL_PATH = Path(os.getenv("BI_MODEL_PATH", str(ROOT_DIR / "models" / "crack_mobilenet.pt")))

# LLM (defect-sheet generation). Empty key -> deterministic fallback.
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()
ANTHROPIC_MODEL = os.getenv("BI_LLM_MODEL", "claude-sonnet-4-6")

APP_NAME = "Building Intelligence"
APP_VERSION = "0.1.0"

# CORS origins for the Vite dev server (it may pick 5173–5176 if ports are busy).
CORS_ORIGINS = [
    f"http://localhost:{p}" for p in (5173, 5174, 5175, 5176)
] + [f"http://127.0.0.1:{p}" for p in (5173, 5174, 5175, 5176)]
