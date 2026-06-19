"""Seed portfolio — real Luxembourg civil-engineering assets (public locations).
Inspection figures are illustrative. Mirrors the frontend demo data so the app
looks identical whether it runs on the mock or the real backend."""
from __future__ import annotations

# (id, name, type, location, lat, lon, inspections, images_analyzed,
#  critical, major, minor, risk_score, last_inspected)
STRUCTURE_SEEDS: list[dict] = [
    {"id": 1, "name": "Pont Adolphe", "type": "Road bridge", "location": "Luxembourg-Ville", "lat": 49.6092, "lon": 6.1258, "inspections": 6, "images_analyzed": 412, "critical": 3, "major": 11, "minor": 24, "risk_score": 74, "last_inspected": "2026-05-28"},
    {"id": 2, "name": "Pont Grande-Duchesse Charlotte", "type": "Road bridge", "location": "Kirchberg", "lat": 49.6212, "lon": 6.1359, "inspections": 5, "images_analyzed": 388, "critical": 2, "major": 7, "minor": 19, "risk_score": 61, "last_inspected": "2026-06-02"},
    {"id": 3, "name": "Belval Parking — Square Mile", "type": "Parking deck", "location": "Esch-sur-Alzette / Belval", "lat": 49.4986, "lon": 5.943, "inspections": 4, "images_analyzed": 524, "critical": 5, "major": 14, "minor": 31, "risk_score": 82, "last_inspected": "2026-05-19"},
    {"id": 4, "name": "Viaduc de Pulvermühle", "type": "Rail viaduct", "location": "Clausen", "lat": 49.6121, "lon": 6.1432, "inspections": 3, "images_analyzed": 246, "critical": 1, "major": 5, "minor": 12, "risk_score": 48, "last_inspected": "2026-06-09"},
    {"id": 5, "name": "Kirchberg P+R", "type": "Parking deck", "location": "Kirchberg", "lat": 49.6293, "lon": 6.1597, "inspections": 4, "images_analyzed": 305, "critical": 0, "major": 3, "minor": 16, "risk_score": 34, "last_inspected": "2026-06-11"},
    {"id": 6, "name": "Mur de soutènement Findel", "type": "Retaining wall", "location": "Findel", "lat": 49.6266, "lon": 6.203, "inspections": 2, "images_analyzed": 158, "critical": 2, "major": 4, "minor": 8, "risk_score": 57, "last_inspected": "2026-05-31"},
    {"id": 7, "name": "Passerelle de la Pétrusse", "type": "Footbridge", "location": "Pétrusse valley", "lat": 49.6035, "lon": 6.1276, "inspections": 3, "images_analyzed": 134, "critical": 0, "major": 1, "minor": 9, "risk_score": 22, "last_inspected": "2026-06-13"},
    {"id": 8, "name": "Viaduc de Dudelange", "type": "Road viaduct", "location": "Dudelange", "lat": 49.4806, "lon": 6.0875, "inspections": 3, "images_analyzed": 277, "critical": 1, "major": 8, "minor": 14, "risk_score": 53, "last_inspected": "2026-05-22"},
    {"id": 9, "name": "Overpass A4 Differdange", "type": "Road overpass", "location": "Differdange", "lat": 49.524, "lon": 5.891, "inspections": 2, "images_analyzed": 191, "critical": 4, "major": 6, "minor": 10, "risk_score": 71, "last_inspected": "2026-05-15"},
    {"id": 10, "name": "Pont de Mersch", "type": "Road bridge", "location": "Mersch", "lat": 49.749, "lon": 6.106, "inspections": 2, "images_analyzed": 142, "critical": 0, "major": 2, "minor": 11, "risk_score": 29, "last_inspected": "2026-06-07"},
    {"id": 11, "name": "Stade de Luxembourg — substructure", "type": "Stadium deck", "location": "Gasperich", "lat": 49.5575, "lon": 6.1542, "inspections": 2, "images_analyzed": 219, "critical": 0, "major": 4, "minor": 13, "risk_score": 38, "last_inspected": "2026-06-04"},
    {"id": 12, "name": "Viaduc d'Ettelbruck", "type": "Road viaduct", "location": "Ettelbruck", "lat": 49.847, "lon": 6.104, "inspections": 3, "images_analyzed": 263, "critical": 2, "major": 9, "minor": 17, "risk_score": 64, "last_inspected": "2026-05-26"},
]

# Portfolio-wide crack-type mix (illustrative).
CRACK_TYPE_MIX: list[dict] = [
    {"type": "Flexural", "count": 78},
    {"type": "Map cracking", "count": 92},
    {"type": "Shear", "count": 24},
    {"type": "Corrosion-induced", "count": 31},
    {"type": "Thermal / restraint", "count": 40},
    {"type": "Plastic shrinkage", "count": 53},
]
