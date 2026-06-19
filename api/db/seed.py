"""Seed the structures table and aggregate the portfolio summary from storage."""
from __future__ import annotations

from datetime import datetime, timezone

from api.db.database import get_conn, init_db
from api.db.seed_data import CRACK_TYPE_MIX, STRUCTURE_SEEDS


def status_from_risk(score: float) -> str:
    if score >= 70:
        return "critical"
    if score >= 40:
        return "action_required"
    return "monitor"


def seed_if_empty() -> None:
    """Create the schema and load the seed structures once."""
    init_db()
    with get_conn() as conn:
        count = conn.execute("SELECT COUNT(*) AS n FROM structures").fetchone()["n"]
        if count:
            return
        conn.executemany(
            """INSERT INTO structures
               (id, name, type, location, lat, lon, inspections, images_analyzed,
                critical, major, minor, risk_score, last_inspected)
               VALUES (:id, :name, :type, :location, :lat, :lon, :inspections,
                       :images_analyzed, :critical, :major, :minor, :risk_score,
                       :last_inspected)""",
            STRUCTURE_SEEDS,
        )


def _round3(x: float) -> float:
    return round(x, 3)


def get_portfolio() -> dict:
    """Aggregate the portfolio summary straight from the structures table."""
    with get_conn() as conn:
        rows = [dict(r) for r in conn.execute("SELECT * FROM structures").fetchall()]

    structures_list = []
    tot_critical = tot_major = tot_minor = 0
    tot_images = tot_cracks = 0
    for r in rows:
        cracks = r["critical"] + r["major"] + r["minor"]
        tot_critical += r["critical"]
        tot_major += r["major"]
        tot_minor += r["minor"]
        tot_images += r["images_analyzed"]
        tot_cracks += cracks
        defect_rate = _round3(cracks / r["images_analyzed"]) if r["images_analyzed"] else 0.0
        structures_list.append(
            {
                "id": r["id"],
                "name": r["name"],
                "type": r["type"],
                "location": r["location"],
                "lat": r["lat"],
                "lon": r["lon"],
                "inspections": r["inspections"],
                "images_analyzed": r["images_analyzed"],
                "cracks_detected": cracks,
                "defect_rate": defect_rate,
                "risk_score": r["risk_score"],
                "by_severity": {
                    "critical": r["critical"],
                    "major": r["major"],
                    "minor": r["minor"],
                },
                "last_inspected": r["last_inspected"],
                "status": status_from_risk(r["risk_score"]),
            }
        )

    structures_list.sort(key=lambda s: s["risk_score"], reverse=True)

    return {
        "structures": len(rows),
        "images_analyzed": tot_images,
        "cracks_detected": tot_cracks,
        "defect_rate": _round3(tot_cracks / tot_images) if tot_images else 0.0,
        "by_severity": {"critical": tot_critical, "major": tot_major, "minor": tot_minor},
        "by_type": CRACK_TYPE_MIX,
        "structures_list": structures_list,
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
