import { useTranslation } from "react-i18next";
import type { PortfolioSummary } from "../../api/types";
import { CodeLabel, InfoTip, Panel } from "../ui";
import { pct } from "../../lib/format";
import { CODES } from "../../lib/dossier";

interface Props {
  summary: PortfolioSummary;
}

interface Kpi {
  code: string;
  label: string;
  value: string;
  accent: "orange" | "amber";
  color: string;
  tip?: string;
  footer: string;
}

/**
 * The four headline KPIs of the portfolio: structures monitored, images analyzed,
 * the defect-detection rate, and total cracks detected. Each is a small Panel with a
 * code label and a large mono figure, matching the building-detail KPI tiles.
 */
export default function KpiGrid({ summary }: Props) {
  const { t } = useTranslation();

  const kpis: Kpi[] = [
    {
      code: CODES.portfolio,
      label: t("portfolio.kpi.structures"),
      value: String(summary.structures),
      accent: "orange",
      color: "rgb(var(--signal-300))",
      footer: "ASSETS // SUPERVISED",
    },
    {
      code: CODES.scan,
      label: t("portfolio.kpi.images"),
      value: summary.images_analyzed.toLocaleString("en-GB"),
      accent: "amber",
      color: "rgb(var(--fg))",
      footer: "CLASSIFIER // PROCESSED",
    },
    {
      code: CODES.risk,
      label: t("portfolio.kpi.defectRate"),
      value: pct(summary.defect_rate, 1),
      accent: "orange",
      color: "rgb(var(--signal-300))",
      tip: t("portfolio.tips.defectRate"),
      footer: "CRACKED / ANALYZED",
    },
    {
      code: CODES.defect,
      label: t("portfolio.kpi.cracks"),
      value: summary.cracks_detected.toLocaleString("en-GB"),
      accent: "amber",
      color: "rgb(var(--amber))",
      footer: "DEFECTS // LOGGED",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((k) => (
        <Panel key={k.label} code={<CodeLabel accent={k.accent}>{k.code}</CodeLabel>} accent={k.accent} footer={k.footer}>
          <div className="flex items-start justify-between gap-2">
            <p className="font-display text-xs font-medium uppercase tracking-wide text-fg-faint">{k.label}</p>
            {k.tip ? <InfoTip text={k.tip} /> : null}
          </div>
          <p className="mt-2 font-mono text-4xl font-bold tabular-nums" style={{ color: k.color }}>
            {k.value}
          </p>
        </Panel>
      ))}
    </div>
  );
}
