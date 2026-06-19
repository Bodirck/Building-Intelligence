import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import type { AnalysisResult, DefectSheet as DefectSheetData } from "../api/types";
import {
  Badge,
  Button,
  CodeLabel,
  EmptyState,
  InfoTip,
  PageHeader,
  Panel,
  Spinner,
} from "../components/ui";
import Dropzone from "../components/analysis/Dropzone";
import CrackScanFrame from "../components/analysis/CrackScanFrame";
import ConfidenceGauge from "../components/analysis/ConfidenceGauge";
import DefectSheet from "../components/analysis/DefectSheet";
import { CODES } from "../lib/dossier";
import { confidencePct } from "../lib/format";
import { SEVERITY_HEX } from "../lib/risk";

type Phase = "idle" | "classifying" | "generating" | "done";

export default function AnalysisPage() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [sheet, setSheet] = useState<DefectSheetData | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  // Revoke the last object URL whenever it is replaced or on unmount.
  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  const run = useCallback(async (f: File) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    setFile(f);
    setResult(null);
    setSheet(null);
    setError(null);
    setPhase("classifying");
    try {
      const r = await api.predict(f);
      previewRef.current = r.preview_url ?? null;
      setResult(r);
      if (r.prediction.label === "crack") {
        setPhase("generating");
        const s = await api.defectSheet(f, { image_id: r.image_id, prediction: r.prediction });
        setSheet(s);
      }
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("done");
    }
  }, []);

  const reset = useCallback(() => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setFile(null);
    setResult(null);
    setSheet(null);
    setError(null);
    setPhase("idle");
  }, []);

  function exportJson() {
    if (!result) return;
    const payload = { ...result, preview_url: undefined, defect_sheet: sheet };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.image_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const isCrack = result?.prediction.label === "crack";
  // A detected crack always reads as an alert (orange, or red when critical);
  // severity itself is conveyed by the badge and the bounding-box color. A clear
  // surface reads green.
  const verdictColor = !isCrack
    ? SEVERITY_HEX.minor
    : sheet?.severity === "critical"
      ? SEVERITY_HEX.critical
      : "#FF8C1A";
  const hasOutput = phase !== "idle" || result != null;

  return (
    <div>
      <PageHeader
        kicker={t("analysis.kicker")}
        title={t("analysis.title")}
        meta={t("analysis.meta")}
        actions={
          hasOutput ? (
            <>
              <Button variant="ghost" size="sm" onClick={reset}>
                {t("analysis.newScan")}
              </Button>
              {result && !error ? (
                <>
                  <Button variant="secondary" size="sm" onClick={exportJson}>
                    {t("analysis.exportJson")}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => window.print()}>
                    {t("analysis.print")}
                  </Button>
                </>
              ) : null}
            </>
          ) : undefined
        }
      />

      {!hasOutput ? (
        <Dropzone onFile={run} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* left: the capture under scan */}
          <div>
            {result?.preview_url ? (
              <CrackScanFrame
                src={result.preview_url}
                regions={result.regions}
                scanning={phase === "classifying"}
                severity={sheet?.severity}
                label={`${t("analysis.scanRef")} ${result.image_id} // ${file?.name ?? ""}`}
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-sm border border-line bg-ink-800">
                <Spinner />
              </div>
            )}
          </div>

          {/* right: verdict + gauge + defect sheet */}
          <div className="flex flex-col gap-6">
            {error ? (
              <Panel code={CODES.analysis} title={t("analysis.errorTitle")} accent="orange">
                <p className="text-sm text-critical">{error}</p>
                <div className="mt-4">
                  <Button variant="secondary" size="sm" onClick={reset}>
                    {t("analysis.newScan")}
                  </Button>
                </div>
              </Panel>
            ) : !result ? (
              <Panel code={CODES.classifier} title={t("analysis.classifying")}>
                <div className="flex items-center gap-3 py-6 text-fg-muted">
                  <Spinner />
                  <span className="font-mono text-xs uppercase tracking-[0.18em]">
                    {t("analysis.classifying")}
                  </span>
                </div>
              </Panel>
            ) : (
              <Panel
                code={CODES.analysis}
                title={result.image_id}
                accent={isCrack ? "orange" : "amber"}
                footer={`${result.prediction.model} // ${result.prediction.inference_ms} ms`}
              >
                {/* verdict */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 items-center justify-center rounded-sm border"
                      style={{ borderColor: verdictColor, color: verdictColor }}
                    >
                      {isCrack ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
                          <path d="M12 3 4 7l1.5 9L12 21l6.5-5L20 7l-8-4Z" strokeLinejoin="round" />
                          <path d="M12 8v5" strokeLinecap="round" />
                          <circle cx="12" cy="16" r="0.6" fill="currentColor" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                          <path d="m5 12.5 4.5 4.5L19 7.5" />
                        </svg>
                      )}
                    </span>
                    <div>
                      <CodeLabel>{CODES.classifier}</CodeLabel>
                      <p className="font-display text-lg font-semibold uppercase tracking-wide" style={{ color: verdictColor }}>
                        {isCrack ? t("analysis.verdictCrack") : t("analysis.verdictNoCrack")}
                      </p>
                      {isCrack && sheet ? (
                        <div className="mt-1">
                          <Badge tone={sheet.severity}>{t(`common.${sheet.severity}`)}</Badge>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <ConfidenceGauge
                    value={result.prediction.confidence}
                    color={verdictColor}
                    label={t("common.confidence")}
                  />
                </div>

                {/* metrics */}
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-3">
                  <Metric label={t("analysis.crackProbability")} value={confidencePct(result.prediction.crack_probability)} tip={t("analysis.tips.confidence")} />
                  <Metric label={t("analysis.model")} value={result.prediction.model} mono />
                  <Metric label={t("analysis.latency")} value={`${result.prediction.inference_ms} ms`} />
                </div>
              </Panel>
            )}

            {/* defect sheet stage */}
            {result && isCrack && !error ? (
              phase === "generating" || !sheet ? (
                <Panel code={CODES.defect} title={t("analysis.generating")}>
                  <div className="flex items-center gap-3 py-6 text-fg-muted">
                    <Spinner />
                    <span className="font-mono text-xs uppercase tracking-[0.18em]">
                      {t("analysis.generating")}
                    </span>
                  </div>
                </Panel>
              ) : (
                <DefectSheet sheet={sheet} />
              )
            ) : null}

            {/* sound surface — no sheet */}
            {result && !isCrack && !error ? (
              <Panel code={CODES.defect} title={t("analysis.noSheet")} accent="amber">
                <EmptyState title={t("analysis.noSheet")} description={t("analysis.noSheetHint")} />
              </Panel>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, mono, tip }: { label: string; value: string; mono?: boolean; tip?: string }) {
  return (
    <div>
      <p className="flex items-center gap-1 font-display text-[11px] font-medium uppercase tracking-[0.16em] text-fg-faint">
        {label}
        {tip ? <InfoTip text={tip} /> : null}
      </p>
      <p className={mono ? "mt-0.5 font-mono text-sm text-fg" : "mt-0.5 text-sm text-fg tabular-nums"}>{value}</p>
    </div>
  );
}
