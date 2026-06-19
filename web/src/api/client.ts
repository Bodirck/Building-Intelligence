import type { AnalysisResult, DefectSheet, Meta, PortfolioSummary, Prediction } from "./types";
import { mockAnalyze, mockPortfolio, MOCK_META } from "../data/mock";

/**
 * The client speaks to the FastAPI backend, but defaults to a built-in mock so the
 * UI runs with zero backend (the mock-first build). Set VITE_USE_MOCK=false to hit
 * the real API (proxied at /api by Vite in dev). The mock simulates latency so the
 * staged loading states (classify → generate sheet) are visible.
 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";

/** Error carrying the HTTP status so callers can branch on it (e.g. 404). */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Build an ApiError from a failed response, preferring the FastAPI `detail` body. */
async function toError(res: Response): Promise<ApiError> {
  let message = `${res.status} ${res.statusText}`;
  try {
    const body = await res.json();
    if (body && typeof body.detail === "string" && body.detail.trim()) {
      message = body.detail;
    }
  } catch {
    // No JSON body; keep the status line.
  }
  return new ApiError(res.status, message);
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw await toError(res);
  return (await res.json()) as T;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const api = {
  meta: async (): Promise<Meta> => {
    if (USE_MOCK) {
      await delay(120);
      return MOCK_META;
    }
    return getJson<Meta>("/api/meta");
  },

  /**
   * Classify a single image (crack / no-crack) and return the prediction plus any
   * regions of interest. The defect sheet is deliberately left null here so the UI
   * can show the fast classification first, then stream the LLM sheet in.
   */
  predict: async (file: File): Promise<AnalysisResult> => {
    if (USE_MOCK) {
      await delay(700);
      const full = mockAnalyze({ name: file.name, size: file.size });
      return { ...full, defect_sheet: null, preview_url: URL.createObjectURL(file) };
    }
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/predict", { method: "POST", body: form });
    if (!res.ok) throw await toError(res);
    const result = (await res.json()) as AnalysisResult;
    return { ...result, defect_sheet: null, preview_url: URL.createObjectURL(file) };
  },

  /**
   * Generate the structured defect sheet for a cracked image. Returns null when the
   * image was classified as uncracked (no sheet is warranted).
   */
  defectSheet: async (
    file: File,
    context: { image_id: string; prediction: Prediction },
  ): Promise<DefectSheet | null> => {
    if (USE_MOCK) {
      await delay(1100);
      return mockAnalyze({ name: file.name, size: file.size }).defect_sheet;
    }
    const res = await fetch("/api/defect-sheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_id: context.image_id, prediction: context.prediction }),
    });
    if (!res.ok) throw await toError(res);
    const body = (await res.json()) as { defect_sheet: DefectSheet | null };
    return body.defect_sheet;
  },

  portfolio: async (): Promise<PortfolioSummary> => {
    if (USE_MOCK) {
      await delay(450);
      return mockPortfolio();
    }
    return getJson<PortfolioSummary>("/api/portfolio");
  },
};
