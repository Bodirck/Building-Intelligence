/**
 * Stable decorative codes for the "CLASSIFIED" dossier chrome, re-themed for the
 * crack-inspection domain. These derive deterministic alphanumeric labels so each
 * structure and scan reads like an instrument readout. Pure functions, no deps.
 *
 * These strings are UI chrome (English, not translated). Any human-readable label
 * shown next to them goes through i18n; the codes themselves are fixed.
 */

/** Structure case number, e.g. assetId(47) -> "STR-047" (zero-padded to 3). */
export function assetId(id: number): string {
  const n = Math.abs(Math.trunc(id));
  return `STR-${String(n).padStart(3, "0")}`;
}

/** Scan reference for a structure, e.g. sector(2) -> "SECTOR 03" (id modulo 6 + 1). */
export function sector(id: number): string {
  const n = Math.abs(Math.trunc(id));
  const s = (n % 6) + 1;
  return `SECTOR ${String(s).padStart(2, "0")}`;
}

/** Defect-sheet id from a numeric scan sequence, e.g. defectId(142) -> "DFT-0142". */
export function defectId(seq: number): string {
  const n = Math.abs(Math.trunc(seq));
  return `DFT-${String(n).padStart(4, "0")}`;
}

/** Constant code labels used as title-bar / chrome text across the dossier UI. */
export const CODES = {
  scan: "SCAN REF //",
  analysis: "ANALYSIS //",
  defect: "DEFECT LOG",
  defects: "DEFECTS // SEVERITY",
  confidence: "CONFIDENCE:",
  classifier: "CLASSIFIER //",
  norm: "NORMATIVE //",
  risk: "RISK INDEX",
  geo: "GEO INTEL",
  intake: "INTAKE // SCAN",
  portfolio: "PORTFOLIO //",
  status: "STATUS:",
} as const;

export type CodeKey = keyof typeof CODES;
