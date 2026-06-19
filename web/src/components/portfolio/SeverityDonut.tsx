import { useTranslation } from "react-i18next";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { SeverityBreakdown } from "../../api/types";
import { SEVERITY_HEX } from "../../lib/risk";
import { useTheme } from "../../theme/ThemeProvider";
import { chartColors } from "../../lib/chartTheme";

interface Props {
  bySeverity: SeverityBreakdown;
}

/** Donut of the portfolio-wide defect severity mix. Empty when nothing is logged. */
export default function SeverityDonut({ bySeverity }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = chartColors(theme);

  const data = [
    { name: t("common.critical"), value: bySeverity.critical, color: SEVERITY_HEX.critical },
    { name: t("common.major"), value: bySeverity.major, color: SEVERITY_HEX.major },
    { name: t("common.minor"), value: bySeverity.minor, color: SEVERITY_HEX.minor },
  ].filter((d) => d.value > 0);

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={88} paddingAngle={2} stroke={c.surface}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, color: c.tooltipText, boxShadow: "none" }}
          labelStyle={{ color: c.tooltipLabel }}
          itemStyle={{ color: c.tooltipText }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: c.tooltipLabel }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
