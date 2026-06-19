import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CrackTypeCount } from "../../api/types";
import { useTheme } from "../../theme/ThemeProvider";
import { chartColors } from "../../lib/chartTheme";

interface Props {
  byType: CrackTypeCount[];
}

/** Distribution of detected defects by crack typology (single-accent bars). */
export default function CrackTypeBars({ byType }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = chartColors(theme);
  const barColor = theme === "light" ? "#E66E00" : "#FF7A00";

  const data = [...byType].sort((a, b) => b.count - a.count);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 36 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
        <XAxis dataKey="type" tick={{ fontSize: 11, fill: c.tick }} tickLine={false} axisLine={false} interval={0} angle={-25} textAnchor="end" />
        <YAxis tick={{ fontSize: 11, fill: c.tick }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: c.cursor }}
          formatter={(value: number) => [value, t("common.defects")]}
          contentStyle={{ fontSize: 12, borderRadius: 8, background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, color: c.tooltipText }}
          labelStyle={{ color: c.tooltipLabel }}
          itemStyle={{ color: c.tooltipText }}
        />
        <Bar dataKey="count" radius={[2, 2, 0, 0]} fill={barColor} />
      </BarChart>
    </ResponsiveContainer>
  );
}
