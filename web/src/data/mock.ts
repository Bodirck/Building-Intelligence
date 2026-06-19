/**
 * Realistic demo data for the mock-first build. Everything here is deterministic so
 * the dashboard and a re-uploaded image always render the same way in a demo.
 *
 * Structures are real Luxembourg civil-engineering assets (public locations); the
 * inspection numbers are illustrative. Defect typologies and their normative
 * references follow Eurocode 2 (EN 1992-1-1) and related EN standards — the same
 * vocabulary the real LLM defect-sheet generator is prompted with.
 */
import type {
  AnalysisResult,
  CrackRegion,
  CrackTypeCount,
  DefectSheet,
  Meta,
  PortfolioSummary,
  SeverityBreakdown,
  Severity,
  StructureStatus,
  StructureSummary,
} from "../api/types";

/* ------------------------------------------------------------------ *
 * Crack typology catalogue — drives the mock classifier + defect sheet
 * ------------------------------------------------------------------ */

interface DefectTemplate {
  crack_type: string;
  severity: Severity;
  structural_element: string;
  location: string;
  width_mm: number | null;
  recommendation: string;
  normative_reference: string;
  severity_rationale: string;
  summary: string;
  regions: CrackRegion[];
}

/** The catalogue the mock draws from. Ordered roughly worst → benign. */
const DEFECT_TEMPLATES: DefectTemplate[] = [
  {
    crack_type: "Shear crack (diagonal)",
    severity: "critical",
    structural_element: "Deck slab / web near support",
    location: "Span 2, web, ~45° toward the bearing",
    width_mm: 0.7,
    recommendation:
      "Restrict load and inspect within 30 days. Diagonal cracking near supports indicates a possible shear-capacity shortfall — commission a structural assessment and monitor width with crack gauges.",
    normative_reference: "Eurocode 2 — EN 1992-1-1 §6.2 (shear) & §7.3.1 (crack width)",
    severity_rationale:
      "Diagonal orientation near a support and width > 0.4 mm point to a shear mechanism, not benign surface cracking.",
    summary:
      "Diagonal crack consistent with a shear demand at the support region; treated as structurally significant.",
    regions: [
      { x: 0.18, y: 0.22, w: 0.46, h: 0.34, score: 0.94 },
    ],
  },
  {
    crack_type: "Corrosion-induced longitudinal crack",
    severity: "critical",
    structural_element: "Pier / reinforced column",
    location: "Pier face, parallel to vertical reinforcement, with rust staining",
    width_mm: 0.9,
    recommendation:
      "Investigate cover and chloride ingress; cracks tracking the rebar with staining indicate active corrosion and spalling risk. Plan concrete repair to EN 1504 and protect the reinforcement.",
    normative_reference: "Eurocode 2 — EN 1992-1-1 §4.4 (durability/cover) + EN 1504-9 (repair)",
    severity_rationale:
      "Crack follows the reinforcement line with oxide staining — a durability failure mode that propagates if untreated.",
    summary:
      "Longitudinal cracking along reinforcement with staining; consistent with reinforcement corrosion.",
    regions: [
      { x: 0.42, y: 0.10, w: 0.16, h: 0.74, score: 0.91 },
    ],
  },
  {
    crack_type: "Flexural crack (transverse)",
    severity: "major",
    structural_element: "Deck slab — tension face",
    location: "Mid-span soffit, transverse to the span",
    width_mm: 0.32,
    recommendation:
      "Record width and schedule re-inspection. Transverse mid-span cracking is expected in reinforced concrete; verify width stays within the Eurocode limit for the exposure class.",
    normative_reference: "Eurocode 2 — EN 1992-1-1 §7.3.1 (w_max for exposure class)",
    severity_rationale:
      "Location and orientation are typical of flexure; width near the 0.3 mm serviceability limit warrants monitoring, not immediate action.",
    summary:
      "Transverse flexural crack at mid-span soffit, close to the serviceability width limit.",
    regions: [
      { x: 0.22, y: 0.46, w: 0.56, h: 0.12, score: 0.88 },
    ],
  },
  {
    crack_type: "Thermal / restraint crack",
    severity: "major",
    structural_element: "Retaining wall / abutment",
    location: "Full-height vertical crack at a restrained section",
    width_mm: 0.4,
    recommendation:
      "Confirm it is dormant (no seasonal movement) and seal against water ingress. Early-age restraint cracking is common; address durability if it penetrates the cover.",
    normative_reference: "Eurocode 2 — EN 1992-1-1 §7.3 (early-age cracking) + EN 206",
    severity_rationale:
      "Through-section vertical crack at a restraint point; structurally minor but a durability path if left open.",
    summary: "Vertical restraint crack at a section change; monitor and seal.",
    regions: [
      { x: 0.48, y: 0.06, w: 0.08, h: 0.82, score: 0.83 },
    ],
  },
  {
    crack_type: "Map cracking (craquelure)",
    severity: "minor",
    structural_element: "Surface concrete / facing",
    location: "Diffuse surface network over the element face",
    width_mm: 0.12,
    recommendation:
      "Cosmetic / durability watch item. Map cracking suggests surface shrinkage or early ASR; record and review at the next routine inspection.",
    normative_reference: "EN 1992-1-1 §7.3.1 + EN 206 (durability provisions)",
    severity_rationale:
      "Shallow interconnected surface pattern with sub-0.2 mm widths; no structural implication at this stage.",
    summary: "Diffuse surface map cracking; cosmetic / durability monitoring.",
    regions: [
      { x: 0.16, y: 0.18, w: 0.66, h: 0.6, score: 0.71 },
    ],
  },
  {
    crack_type: "Plastic shrinkage crack",
    severity: "minor",
    structural_element: "Slab top surface",
    location: "Short, randomly oriented surface cracks",
    width_mm: 0.15,
    recommendation:
      "No structural action. Plastic shrinkage forms at placing; log it and confirm it does not open further over successive inspections.",
    normative_reference: "EN 13670 (execution of concrete structures) §8 + EN 206",
    severity_rationale:
      "Short, shallow, early-age surface cracking; benign once dormant.",
    summary: "Shallow plastic-shrinkage cracking from placement; benign.",
    regions: [
      { x: 0.3, y: 0.34, w: 0.34, h: 0.22, score: 0.66 },
    ],
  },
];

/** The "no crack" branch of the classifier. */
const UNCRACKED_SUMMARY =
  "No crack signature detected. Surface appears sound at the analyzed resolution.";

/* ------------------------------------------------------------------ *
 * Deterministic hashing so a given filename always yields the same demo
 * ------------------------------------------------------------------ */

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Mock the full analysis pipeline for one uploaded file. ~15% of images come back
 * uncracked; the rest map deterministically onto a defect template. Confidence is
 * derived from the hash so it looks model-like but stays stable per file.
 */
export function mockAnalyze(file: { name: string; size?: number }): AnalysisResult {
  const h = hash(`${file.name}:${file.size ?? 0}`);
  const uncracked = h % 100 < 15;
  const seq = (h % 9000) + 1000;
  const image_id = `IMG-${seq}`;

  if (uncracked) {
    const conf = 0.9 + ((h >> 3) % 90) / 1000; // 0.900 .. 0.989
    return {
      image_id,
      filename: file.name,
      captured_at: null,
      prediction: {
        label: "uncracked",
        confidence: round3(conf),
        crack_probability: round3(1 - conf),
        model: "baseline-heuristic",
        inference_ms: 40 + (h % 60),
      },
      regions: [],
      defect_sheet: null,
    };
  }

  const tpl = DEFECT_TEMPLATES[h % DEFECT_TEMPLATES.length];
  const conf = 0.86 + ((h >> 5) % 130) / 1000; // 0.860 .. 0.989
  const crackProb = Math.min(0.99, conf + 0.005);

  const sheet: DefectSheet = {
    defect_id: `DFT-${seq}`,
    crack_type: tpl.crack_type,
    severity: tpl.severity,
    severity_rationale: tpl.severity_rationale,
    structural_element: tpl.structural_element,
    location: tpl.location,
    width_mm: tpl.width_mm,
    recommendation: tpl.recommendation,
    normative_reference: tpl.normative_reference,
    summary: tpl.summary,
    confidence: round3(0.82 + ((h >> 7) % 130) / 1000),
    generated_by: "mock",
  };

  return {
    image_id,
    filename: file.name,
    captured_at: null,
    prediction: {
      label: "crack",
      confidence: round3(conf),
      crack_probability: round3(crackProb),
      model: "baseline-heuristic",
      inference_ms: 55 + (h % 90),
    },
    regions: tpl.regions,
    defect_sheet: sheet,
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/* ------------------------------------------------------------------ *
 * Portfolio — supervised structures
 * ------------------------------------------------------------------ */

interface StructureSeed {
  id: number;
  name: string;
  type: string;
  location: string;
  lat: number;
  lon: number;
  inspections: number;
  images_analyzed: number;
  by_severity: SeverityBreakdown;
  risk_score: number;
  last_inspected: string;
}

const STRUCTURE_SEEDS: StructureSeed[] = [
  { id: 1, name: "Pont Adolphe", type: "Road bridge", location: "Luxembourg-Ville", lat: 49.6092, lon: 6.1258, inspections: 6, images_analyzed: 412, by_severity: { critical: 3, major: 11, minor: 24 }, risk_score: 74, last_inspected: "2026-05-28" },
  { id: 2, name: "Pont Grande-Duchesse Charlotte", type: "Road bridge", location: "Kirchberg", lat: 49.6212, lon: 6.1359, inspections: 5, images_analyzed: 388, by_severity: { critical: 2, major: 7, minor: 19 }, risk_score: 61, last_inspected: "2026-06-02" },
  { id: 3, name: "Belval Parking — Square Mile", type: "Parking deck", location: "Esch-sur-Alzette / Belval", lat: 49.4986, lon: 5.943, inspections: 4, images_analyzed: 524, by_severity: { critical: 5, major: 14, minor: 31 }, risk_score: 82, last_inspected: "2026-05-19" },
  { id: 4, name: "Viaduc de Pulvermühle", type: "Rail viaduct", location: "Clausen", lat: 49.6121, lon: 6.1432, inspections: 3, images_analyzed: 246, by_severity: { critical: 1, major: 5, minor: 12 }, risk_score: 48, last_inspected: "2026-06-09" },
  { id: 5, name: "Kirchberg P+R", type: "Parking deck", location: "Kirchberg", lat: 49.6293, lon: 6.1597, inspections: 4, images_analyzed: 305, by_severity: { critical: 0, major: 3, minor: 16 }, risk_score: 34, last_inspected: "2026-06-11" },
  { id: 6, name: "Mur de soutènement Findel", type: "Retaining wall", location: "Findel", lat: 49.6266, lon: 6.203, inspections: 2, images_analyzed: 158, by_severity: { critical: 2, major: 4, minor: 8 }, risk_score: 57, last_inspected: "2026-05-31" },
  { id: 7, name: "Passerelle de la Pétrusse", type: "Footbridge", location: "Pétrusse valley", lat: 49.6035, lon: 6.1276, inspections: 3, images_analyzed: 134, by_severity: { critical: 0, major: 1, minor: 9 }, risk_score: 22, last_inspected: "2026-06-13" },
  { id: 8, name: "Viaduc de Dudelange", type: "Road viaduct", location: "Dudelange", lat: 49.4806, lon: 6.0875, inspections: 3, images_analyzed: 277, by_severity: { critical: 1, major: 8, minor: 14 }, risk_score: 53, last_inspected: "2026-05-22" },
  { id: 9, name: "Overpass A4 Differdange", type: "Road overpass", location: "Differdange", lat: 49.524, lon: 5.891, inspections: 2, images_analyzed: 191, by_severity: { critical: 4, major: 6, minor: 10 }, risk_score: 71, last_inspected: "2026-05-15" },
  { id: 10, name: "Pont de Mersch", type: "Road bridge", location: "Mersch", lat: 49.749, lon: 6.106, inspections: 2, images_analyzed: 142, by_severity: { critical: 0, major: 2, minor: 11 }, risk_score: 29, last_inspected: "2026-06-07" },
  { id: 11, name: "Stade de Luxembourg — substructure", type: "Stadium deck", location: "Gasperich", lat: 49.5575, lon: 6.1542, inspections: 2, images_analyzed: 219, by_severity: { critical: 0, major: 4, minor: 13 }, risk_score: 38, last_inspected: "2026-06-04" },
  { id: 12, name: "Viaduc d'Ettelbruck", type: "Road viaduct", location: "Ettelbruck", lat: 49.847, lon: 6.104, inspections: 3, images_analyzed: 263, by_severity: { critical: 2, major: 9, minor: 17 }, risk_score: 64, last_inspected: "2026-05-26" },
];

/** Map a 0..100 risk score to the supervisory status used in the table chips. */
export function statusFromRisk(score: number): StructureStatus {
  if (score >= 70) return "critical";
  if (score >= 40) return "action_required";
  return "monitor";
}

const STRUCTURES: StructureSummary[] = STRUCTURE_SEEDS.map((s) => {
  const cracks_detected = s.by_severity.critical + s.by_severity.major + s.by_severity.minor;
  return {
    ...s,
    cracks_detected,
    defect_rate: round3(cracks_detected / s.images_analyzed),
    status: statusFromRisk(s.risk_score),
  };
});

function sumSeverity(list: StructureSummary[]): SeverityBreakdown {
  return list.reduce<SeverityBreakdown>(
    (acc, s) => ({
      critical: acc.critical + s.by_severity.critical,
      major: acc.major + s.by_severity.major,
      minor: acc.minor + s.by_severity.minor,
    }),
    { critical: 0, major: 0, minor: 0 },
  );
}

/** Crack-type mix across the portfolio (illustrative, sums consistent with KPIs). */
const BY_TYPE: CrackTypeCount[] = [
  { type: "Flexural", count: 78 },
  { type: "Map cracking", count: 92 },
  { type: "Shear", count: 24 },
  { type: "Corrosion-induced", count: 31 },
  { type: "Thermal / restraint", count: 40 },
  { type: "Plastic shrinkage", count: 53 },
];

export function mockPortfolio(): PortfolioSummary {
  const by_severity = sumSeverity(STRUCTURES);
  const images_analyzed = STRUCTURES.reduce((a, s) => a + s.images_analyzed, 0);
  const cracks_detected = STRUCTURES.reduce((a, s) => a + s.cracks_detected, 0);
  return {
    structures: STRUCTURES.length,
    images_analyzed,
    cracks_detected,
    defect_rate: round3(cracks_detected / images_analyzed),
    by_severity,
    by_type: BY_TYPE,
    structures_list: STRUCTURES,
    generated_at: "2026-06-19T09:00:00Z",
  };
}

export const MOCK_META: Meta = {
  app: "Building Intelligence",
  version: "0.1.0",
  provider: "mock",
  classifier: "baseline-heuristic",
};
