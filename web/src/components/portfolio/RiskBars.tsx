import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StructureSummary } from "../../api/types";
import { riskHex } from "../../lib/risk";
import { useTheme } from "../../theme/ThemeProvider";
import { chartColors } from "../../lib/chartTheme";

interface Props {
  structures: StructureSummary[];
  /** Optional: notify the parent which structure was clicked. */
  onSelect?: (id: number) => void;
}

function truncate(name: string, max = 16): string {
  return name.length > max ? name.slice(0, max - 1) + "…" : name;
}

/** Top structures ranked by composite risk score; each bar colored by its band. */
export default function RiskBars({ structures, onSelect }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = chartColors(theme);

  const data = [...structures]
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 12)
    .map((s) => ({ name: truncate(s.name), score: Math.round(s.risk_score), fullName: s.name, id: s.id }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 64 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: c.tick }} tickLine={false} axisLine={false} interval={0} angle={-38} textAnchor="end" />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: c.tick }} tickLine={false} axisLine={false} width={32} />
        <Tooltip
          cursor={{ fill: c.cursor }}
          formatter={(value: number) => [value, t("common.riskScore")]}
          labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName ?? _label}
          contentStyle={{ fontSize: 12, borderRadius: 8, background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, color: c.tooltipText }}
          labelStyle={{ color: c.tooltipLabel }}
          itemStyle={{ color: c.tooltipText }}
        />
        <Bar
          dataKey="score"
          radius={[2, 2, 0, 0]}
          cursor={onSelect ? "pointer" : undefined}
          onClick={(_entry, index) => {
            const b = data[index];
            if (b && onSelect) onSelect(b.id);
          }}
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={riskHex(entry.score)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
