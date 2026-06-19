import { confidencePct } from "../../lib/format";

interface Props {
  /** Confidence 0..1. */
  value: number;
  /** Hex color for the value arc; defaults to the signal accent. */
  color?: string;
  label: string;
}

/**
 * A semicircular instrument gauge for the classifier confidence. Pure SVG, no deps.
 * The arc fills clockwise to the value; the figure is mono / tabular so it reads as
 * a calibrated readout.
 */
export default function ConfidenceGauge({ value, color = "#FF8C1A", label }: Props) {
  const v = Math.max(0, Math.min(1, value));
  // Top semicircle from (10,60) to (110,60), radius 50, length = pi * r.
  const ARC = Math.PI * 50;
  const dash = `${v * ARC} ${ARC}`;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 74" className="w-full max-w-[200px]" role="img" aria-label={`${label}: ${confidencePct(v)}`}>
        {/* track */}
        <path
          d="M10 60 A50 50 0 0 1 110 60"
          fill="none"
          stroke="rgb(var(--line-strong))"
          strokeWidth={9}
          strokeLinecap="round"
        />
        {/* value */}
        <path
          d="M10 60 A50 50 0 0 1 110 60"
          fill="none"
          stroke={color}
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={dash}
        />
        <text
          x="60"
          y="54"
          textAnchor="middle"
          className="fill-fg font-mono"
          style={{ fontSize: 22, fontWeight: 700 }}
        >
          {confidencePct(v)}
        </text>
      </svg>
      <span className="-mt-1 font-display text-[11px] font-medium uppercase tracking-[0.18em] text-fg-faint">
        {label}
      </span>
    </div>
  );
}
