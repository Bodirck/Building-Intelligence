/**
 * Small presentation helpers, kept free of React so charts, tables and panels can
 * all share one source of truth for number / date formatting.
 */

/** Format a 0..1 ratio as a whole-number percentage, e.g. 0.732 -> "73%". */
export function pct(ratio: number, digits = 0): string {
  return `${(ratio * 100).toFixed(digits)}%`;
}

/** Format a confidence 0..1 as a percentage with one decimal, e.g. 0.9421 -> "94.2%". */
export function confidencePct(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

/** ISO date -> short readable date, e.g. "2026-05-14" -> "14 May 2026". */
export function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Crack width in mm, e.g. 0.3 -> "0.30 mm"; null -> "—". */
export function widthMm(mm: number | null): string {
  return mm == null ? "—" : `${mm.toFixed(2)} mm`;
}

/** Clamp a number into [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
