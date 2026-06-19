"""SQLite storage. Two tables: the supervised `structures` portfolio (seeded) and
an `inspections` log that records every image the classifier processes (the
'storage' stage of the data pipeline)."""
from __future__ import annotations

import sqlite3

from api.config import DB_PATH

SCHEMA = """
CREATE TABLE IF NOT EXISTS structures (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL,
    type            TEXT NOT NULL,
    location        TEXT NOT NULL,
    lat             REAL,
    lon             REAL,
    inspections     INTEGER NOT NULL DEFAULT 0,
    images_analyzed INTEGER NOT NULL DEFAULT 0,
    critical        INTEGER NOT NULL DEFAULT 0,
    major           INTEGER NOT NULL DEFAULT 0,
    minor           INTEGER NOT NULL DEFAULT 0,
    risk_score      REAL NOT NULL DEFAULT 0,
    last_inspected  TEXT
);

CREATE TABLE IF NOT EXISTS inspections (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    image_id          TEXT NOT NULL,
    filename          TEXT,
    label             TEXT NOT NULL,
    confidence        REAL NOT NULL,
    crack_probability REAL NOT NULL,
    structure_id      INTEGER,
    severity          TEXT,
    crack_type        TEXT,
    model             TEXT,
    features          TEXT,
    created_at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inspections_image ON inspections(image_id);
"""


def get_conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript(SCHEMA)
