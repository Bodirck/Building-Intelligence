"""Pydantic models — the API contract. Field names are snake_case and map 1:1 to
the frontend TypeScript types in web/src/api/types.ts."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel

Severity = Literal["critical", "major", "minor"]
CrackLabel = Literal["crack", "uncracked"]
StructureStatus = Literal["monitor", "action_required", "critical"]


class Prediction(BaseModel):
    label: CrackLabel
    confidence: float
    crack_probability: float
    model: str
    inference_ms: int


class CrackRegion(BaseModel):
    x: float
    y: float
    w: float
    h: float
    score: float


class DefectSheet(BaseModel):
    defect_id: str
    crack_type: str
    severity: Severity
    severity_rationale: str
    structural_element: str
    location: str
    width_mm: Optional[float]
    recommendation: str
    normative_reference: str
    summary: str
    confidence: float
    generated_by: Literal["llm", "mock"]


class AnalysisResult(BaseModel):
    image_id: str
    filename: str
    captured_at: Optional[str] = None
    prediction: Prediction
    regions: list[CrackRegion]
    defect_sheet: Optional[DefectSheet] = None


class DefectSheetRequest(BaseModel):
    image_id: str
    prediction: Prediction


class DefectSheetResponse(BaseModel):
    defect_sheet: Optional[DefectSheet]


class SeverityBreakdown(BaseModel):
    critical: int
    major: int
    minor: int


class CrackTypeCount(BaseModel):
    type: str
    count: int


class StructureSummary(BaseModel):
    id: int
    name: str
    type: str
    location: str
    lat: Optional[float]
    lon: Optional[float]
    inspections: int
    images_analyzed: int
    cracks_detected: int
    defect_rate: float
    risk_score: float
    by_severity: SeverityBreakdown
    last_inspected: str
    status: StructureStatus


class PortfolioSummary(BaseModel):
    structures: int
    images_analyzed: int
    defect_rate: float
    cracks_detected: int
    by_severity: SeverityBreakdown
    by_type: list[CrackTypeCount]
    structures_list: list[StructureSummary]
    generated_at: str


class Meta(BaseModel):
    app: str
    version: str
    provider: str
    classifier: str
