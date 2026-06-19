import { lazy, Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import type { PortfolioSummary } from "../api/types";
import {
  CodeLabel,
  EmptyState,
  InfoTip,
  PageHeader,
  Panel,
  Spinner,
  Tabs,
  type TabItem,
} from "../components/ui";
import KpiGrid from "../components/portfolio/KpiGrid";
import SeverityDonut from "../components/portfolio/SeverityDonut";
import CrackTypeBars from "../components/portfolio/CrackTypeBars";
import RiskBars from "../components/portfolio/RiskBars";
import StructureTable from "../components/portfolio/StructureTable";
import { CODES } from "../lib/dossier";

// Leaflet only downloads when the dashboard renders the map (own chunk).
const StructureMap = lazy(() => import("../components/portfolio/StructureMap"));

export default function PortfolioPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<PortfolioSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .portfolio()
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <div>
        <PageHeader kicker={t("portfolio.kicker")} title={t("portfolio.title")} />
        <Panel code={CODES.portfolio} title="ERROR">
          <p className="text-sm text-critical">{error}</p>
        </Panel>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <PageHeader kicker={t("portfolio.kicker")} title={t("portfolio.title")} meta={t("portfolio.meta")} />
        <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
          <Spinner />
        </div>
      </div>
    );
  }

  const overview = (
    <div className="flex flex-col gap-6">
      <KpiGrid summary={data} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel code={CODES.defects} title={t("portfolio.severityMix")}>
          <div className="mb-1 flex justify-end">
            <InfoTip text={t("portfolio.tips.severityMix")} />
          </div>
          <SeverityDonut bySeverity={data.by_severity} />
        </Panel>
        <Panel code={<CodeLabel accent="amber">CRACK // TYPES</CodeLabel>} accent="amber" title={t("portfolio.byType")}>
          <CrackTypeBars byType={data.by_type} />
        </Panel>
      </div>

      <Panel code={CODES.risk} title={t("portfolio.topRisk")} footer="RANKED // COMPOSITE RISK 0-100">
        <div className="mb-1 flex justify-end">
          <InfoTip text={t("portfolio.tips.topRisk")} />
        </div>
        <RiskBars structures={data.structures_list} />
      </Panel>

      <Panel code={CODES.geo} title={t("portfolio.map")} footer="LUXEMBOURG // SUPERVISED ASSETS">
        <Suspense
          fallback={
            <div className="flex h-[420px] items-center justify-center rounded-sm border border-line bg-ink-800">
              <Spinner />
            </div>
          }
        >
          <StructureMap structures={data.structures_list} />
        </Suspense>
      </Panel>
    </div>
  );

  const register = (
    <div className="flex flex-col gap-4">
      <Panel code={CODES.portfolio} title={t("portfolio.register")} footer={`${data.structures} ${t("common.structures").toUpperCase()}`}>
        <StructureTable structures={data.structures_list} />
      </Panel>
    </div>
  );

  const tabs: TabItem[] = [
    { id: "overview", label: t("portfolio.tabs.overview"), content: overview },
    { id: "register", label: t("portfolio.tabs.register"), content: register },
  ];

  return (
    <div>
      <PageHeader
        kicker={t("portfolio.kicker")}
        title={t("portfolio.title")}
        meta={t("portfolio.meta")}
      />
      <Tabs items={tabs} paramKey="tab" defaultId="overview" ariaLabel={t("portfolio.title")} />
    </div>
  );
}
