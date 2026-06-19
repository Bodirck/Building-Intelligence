import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Severity, StructureStatus, StructureSummary } from "../../api/types";
import { Badge } from "../ui";
import { cn } from "../../lib/cn";
import { pct, shortDate } from "../../lib/format";
import { riskHex } from "../../lib/risk";
import { assetId } from "../../lib/dossier";

type SortKey = "name" | "type" | "location" | "cracks_detected" | "defect_rate" | "risk_score";
type SortDir = "asc" | "desc";

interface ColumnDef {
  key: SortKey;
  i18n: string;
  numeric?: boolean;
  hideSmall?: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: "name", i18n: "portfolio.table.structure" },
  { key: "type", i18n: "portfolio.table.type", hideSmall: true },
  { key: "location", i18n: "portfolio.table.location", hideSmall: true },
  { key: "cracks_detected", i18n: "portfolio.table.cracks", numeric: true },
  { key: "defect_rate", i18n: "portfolio.table.defectRate", numeric: true, hideSmall: true },
  { key: "risk_score", i18n: "portfolio.table.risk", numeric: true },
];

const STATUS_TONE: Record<StructureStatus, Severity> = {
  critical: "critical",
  action_required: "major",
  monitor: "minor",
};

/** Three small severity chips (critical / major / minor counts). */
function SeverityCells({ by }: { by: { critical: number; major: number; minor: number } }) {
  const items: { sev: Severity; n: number }[] = [
    { sev: "critical", n: by.critical },
    { sev: "major", n: by.major },
    { sev: "minor", n: by.minor },
  ];
  const tone: Record<Severity, string> = {
    critical: "border-critical/30 bg-critical/15 text-critical",
    major: "border-major/30 bg-major/15 text-major",
    minor: "border-minor/30 bg-minor/15 text-minor",
  };
  return (
    <span className="inline-flex items-center gap-1">
      {items.map((it) => (
        <span key={it.sev} className={cn("inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-sm border px-1 font-mono text-[11px] font-medium tabular-nums", tone[it.sev])}>
          {it.n}
        </span>
      ))}
    </span>
  );
}

export default function StructureTable({ structures }: { structures: StructureSummary[] }) {
  const { t } = useTranslation();
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "risk_score", dir: "desc" });

  const rows = useMemo(() => {
    const sorted = [...structures].sort((a, b) => {
      const col = COLUMNS.find((c) => c.key === sort.key);
      let base: number;
      if (col?.numeric) {
        base = (a[sort.key] as number) - (b[sort.key] as number);
      } else {
        base = String(a[sort.key]).localeCompare(String(b[sort.key]), "en", { sensitivity: "base" });
      }
      return sort.dir === "asc" ? base : -base;
    });
    return sorted;
  }, [structures, sort]);

  function cycle(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" ? "asc" : "desc" }));
  }

  function ariaSort(key: SortKey): "ascending" | "descending" | "none" {
    if (sort.key !== key) return "none";
    return sort.dir === "asc" ? "ascending" : "descending";
  }

  return (
    <div className="overflow-x-auto rounded-sm border border-line">
      <table className="min-w-full divide-y divide-line text-sm">
        <thead className="bg-ink-800">
          <tr className="font-display text-[11px] font-medium uppercase tracking-[0.18em] text-fg-faint">
            {COLUMNS.map((col) => (
              <th key={col.key} aria-sort={ariaSort(col.key)} className={cn("px-3 py-2", col.numeric ? "text-right" : "text-left", col.hideSmall && "hidden md:table-cell")}>
                <button
                  type="button"
                  onClick={() => cycle(col.key)}
                  className={cn("inline-flex items-center gap-1 rounded-sm py-1 font-display uppercase tracking-[0.18em] transition-colors hover:text-signal-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-400/70", col.numeric && "flex-row-reverse")}
                >
                  {t(col.i18n)}
                  <SortGlyph state={sort.key === col.key ? sort.dir : "none"} />
                </button>
              </th>
            ))}
            <th className="px-3 py-2 text-left font-medium">{t("portfolio.table.severity")}</th>
            <th className="px-3 py-2 text-left font-medium">{t("portfolio.table.status")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((s) => (
            <tr key={s.id} className="transition-colors duration-150 hover:bg-ink-800/60">
              <td className="px-3 py-2.5">
                <span className="block font-display text-sm font-medium uppercase tracking-wide text-fg">{s.name}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-faint">{assetId(s.id)} · {shortDate(s.last_inspected)}</span>
              </td>
              <td className="hidden whitespace-nowrap px-3 py-2.5 text-fg-muted md:table-cell">{s.type}</td>
              <td className="hidden whitespace-nowrap px-3 py-2.5 text-fg-muted md:table-cell">{s.location}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums text-fg">{s.cracks_detected}</td>
              <td className="hidden whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums text-fg-muted md:table-cell">{pct(s.defect_rate, 1)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right">
                <span className="font-mono text-base font-bold tabular-nums" style={{ color: riskHex(s.risk_score) }}>{s.risk_score}</span>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5"><SeverityCells by={s.by_severity} /></td>
              <td className="whitespace-nowrap px-3 py-2.5">
                <Badge tone={STATUS_TONE[s.status]}>{t(`portfolio.status.${s.status}`)}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortGlyph({ state }: { state: "none" | "asc" | "desc" }) {
  return (
    <span className="inline-flex flex-col leading-none" aria-hidden="true">
      <svg width="7" height="4" viewBox="0 0 7 4" className={state === "asc" ? "text-signal-300" : "text-fg-muted"}>
        <path d="M3.5 0 7 4H0z" fill="currentColor" />
      </svg>
      <svg width="7" height="4" viewBox="0 0 7 4" className={cn("mt-px", state === "desc" ? "text-signal-300" : "text-fg-muted")}>
        <path d="M3.5 4 0 0h7z" fill="currentColor" />
      </svg>
    </span>
  );
}
