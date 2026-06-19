/**
 * Domain types for Building Intelligence. The frontend and the FastAPI backend
 * share this shape (the backend returns snake_case JSON that maps 1:1 here).
 *
 * Severity is the single vocabulary defined in lib/risk and re-exported so call
 * sites can import it from either place.
 */
import type { Severity } from "../lib/risk";

export type { Severity };

/** Binary classifier verdict for a single image. */
export type CrackLabel = "crack" | "uncracked";

/** Output of the crack / no-crack classifier for one image. */
export interface Prediction {
  /** Predicted class. */
  label: CrackLabel;
  /** Confidence in the predicted class, 0..1. */
  confidence: number;
  /** Probability the image contains a crack, 0..1 (label is crack when >= 0.5). */
  crack_probability: number;
  /** Backing model, e.g. "mobilenet_v3_small" or "baseline-heuristic". */
  model: string;
  /** Inference latency in milliseconds. */
  inference_ms: number;
}

/** A localized region of interest the model flagged, in 0..1 image coordinates. */
export interface CrackRegion {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Per-region crack probability, 0..1. */
  score: number;
}

/**
 * Structured defect sheet generated for a cracked image. Mirrors what a field
 * inspector would otherwise hand-fill: type, severity, where, what to do, and the
 * normative basis (Eurocode / EN standard).
 */
export interface DefectSheet {
  defect_id: string;
  /** Engineering crack typology, e.g. "Flexural crack", "Shear crack". */
  crack_type: string;
  severity: Severity;
  /** One line justifying the severity call. */
  severity_rationale: string;
  /** Structural element affected, e.g. "Deck slab", "Pier", "Retaining wall". */
  structural_element: string;
  /** Free-text location on the structure, e.g. "Span 2, soffit, mid-span". */
  location: string;
  /** Estimated crack width in mm (drives Eurocode width checks); null if N/A. */
  width_mm: number | null;
  /** Recommended action for the inspector / asset manager. */
  recommendation: string;
  /** Normative reference, e.g. "Eurocode 2 (EN 1992-1-1) §7.3.1 — crack width". */
  normative_reference: string;
  /** Short human summary of the finding. */
  summary: string;
  /** Sheet-level confidence, 0..1. */
  confidence: number;
  /** Whether a real LLM produced this, or the deterministic fallback. */
  generated_by: "llm" | "mock";
}

/** Everything the Analysis screen needs after a single image is processed. */
export interface AnalysisResult {
  image_id: string;
  filename: string;
  /** Object URL for the uploaded preview (frontend only). */
  preview_url?: string;
  captured_at: string | null;
  prediction: Prediction;
  regions: CrackRegion[];
  /** Present only when the image is classified as cracked. */
  defect_sheet: DefectSheet | null;
}

export type StructureStatus = "monitor" | "action_required" | "critical";

/** A single structure in the supervised portfolio. */
export interface StructureSummary {
  id: number;
  name: string;
  /** Asset class, e.g. "Road bridge", "Parking deck", "Retaining wall". */
  type: string;
  location: string;
  lat: number | null;
  lon: number | null;
  inspections: number;
  images_analyzed: number;
  cracks_detected: number;
  /** Share of analyzed images classified as cracked, 0..1. */
  defect_rate: number;
  /** Aggregate structural risk, 0..100. */
  risk_score: number;
  by_severity: SeverityBreakdown;
  last_inspected: string;
  status: StructureStatus;
}

export interface SeverityBreakdown {
  critical: number;
  major: number;
  minor: number;
}

export interface CrackTypeCount {
  type: string;
  count: number;
}

/** Aggregate KPIs + series for the Portfolio dashboard. */
export interface PortfolioSummary {
  structures: number;
  images_analyzed: number;
  /** Overall share of analyzed images classified as cracked, 0..1. */
  defect_rate: number;
  cracks_detected: number;
  by_severity: SeverityBreakdown;
  by_type: CrackTypeCount[];
  structures_list: StructureSummary[];
  generated_at: string;
}

/** Backend identity / capability probe, surfaced as a header chip. */
export interface Meta {
  app: string;
  version: string;
  /** Defect-sheet LLM provider in effect: "anthropic" or "mock". */
  provider: string;
  /** Classifier in effect: e.g. "mobilenet_v3_small" or "baseline-heuristic". */
  classifier: string;
}
