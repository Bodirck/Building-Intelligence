import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { DefectSheet as DefectSheetData } from "../../api/types";
import { Badge, CodeLabel, DecodeText, Panel } from "../ui";
import { confidencePct, widthMm } from "../../lib/format";
import { CODES } from "../../lib/dossier";

interface Props {
  sheet: DefectSheetData;
}

/** A label / value row in the dossier grid. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 border-b border-line py-2.5 last:border-b-0 sm:grid-cols-[9rem_1fr]">
      <dt className="font-display text-[11px] font-medium uppercase tracking-[0.16em] text-fg-faint">
        {label}
      </dt>
      <dd className="text-sm text-fg">{children}</dd>
    </div>
  );
}

/**
 * The structured defect sheet — the generated artifact a field inspector would
 * otherwise fill by hand. Type, severity, element, location, estimated width, the
 * normative basis (Eurocode / EN), the severity rationale and the recommended
 * action. Print-friendly and exportable from the parent page.
 */
export default function DefectSheet({ sheet }: Props) {
  const { t } = useTranslation();
  const isLlm = sheet.generated_by === "llm";

  return (
    <Panel
      code={CODES.defect}
      title={<DecodeText text={sheet.defect_id} />}
      footer={`${sheet.defect_id} // ${sheet.severity.toUpperCase()} // ${isLlm ? "LLM" : "DEMO"}`}
    >
      {/* headline: crack type + severity */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <CodeLabel>{t("defect.type")}</CodeLabel>
          <p className="font-display text-xl font-semibold uppercase tracking-wide text-fg">
            {sheet.crack_type}
          </p>
        </div>
        <Badge tone={sheet.severity} className="text-sm">
          {t(`common.${sheet.severity}`)}
        </Badge>
      </div>

      <dl>
        <Row label={t("defect.element")}>{sheet.structural_element}</Row>
        <Row label={t("defect.location")}>{sheet.location}</Row>
        <Row label={t("defect.width")}>
          <span className="font-mono tabular-nums">{widthMm(sheet.width_mm)}</span>
        </Row>
        <Row label={t("defect.norm")}>
          <span className="font-mono text-[13px] leading-snug text-signal-300">
            {sheet.normative_reference}
          </span>
        </Row>
      </dl>

      {/* severity rationale */}
      <div className="mt-4 border-l-2 border-line-strong pl-3">
        <CodeLabel accent="amber">{t("defect.rationale")}</CodeLabel>
        <p className="mt-1 text-sm text-fg-muted">{sheet.severity_rationale}</p>
      </div>

      {/* recommendation — the actionable output */}
      <div className="mt-4 rounded-sm border border-signal-500/30 bg-signal-500/5 p-3">
        <CodeLabel>{t("defect.recommendation")}</CodeLabel>
        <p className="mt-1 text-sm text-fg">{sheet.recommendation}</p>
      </div>

      {/* footer meta */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-fg-muted">
        <span className="flex items-center gap-1.5">
          <span className="font-display uppercase tracking-[0.16em] text-fg-faint">
            {t("defect.sheetConfidence")}
          </span>
          <span className="font-mono tabular-nums text-fg">{confidencePct(sheet.confidence)}</span>
        </span>
        <Badge tone={isLlm ? "signal" : "neutral"}>
          {t("defect.generatedBy")}: {isLlm ? t("defect.generatedByLlm") : t("defect.generatedByMock")}
        </Badge>
      </div>
    </Panel>
  );
}
