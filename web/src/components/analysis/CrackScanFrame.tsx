import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import type { CrackRegion, Severity } from "../../api/types";
import { SEVERITY_HEX } from "../../lib/risk";

interface Props {
  src: string;
  regions: CrackRegion[];
  /** While true, a scan sweep runs over the image and boxes are hidden. */
  scanning: boolean;
  /** Tone for the bounding boxes; defaults to the signal accent. */
  severity?: Severity;
  label?: string;
}

/**
 * The uploaded inspection photo framed as an instrument readout: corner brackets, a
 * one-shot scan sweep while the classifier runs, then bounding boxes over the
 * regions of interest (0..1 image coordinates) once analysis settles. Honest about
 * being indicative — the boxes carry their model score.
 */
export default function CrackScanFrame({ src, regions, scanning, severity, label }: Props) {
  const { t } = useTranslation();
  const boxColor = severity ? SEVERITY_HEX[severity] : "#FF8C1A";

  return (
    <div className="relative overflow-hidden rounded-sm border border-line bg-ink-800">
      <div className="relative aspect-[4/3] w-full">
        <img src={src} alt={label ?? "Inspection capture"} className="h-full w-full object-cover" />

        {/* darken slightly so the overlay chrome stays legible on bright photos */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-ink-950/10" />

        {/* corner brackets */}
        <Corners />

        {/* scan sweep while classifying */}
        {scanning ? (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1/3 animate-scanline bg-gradient-to-b from-transparent via-signal-400/35 to-transparent" />
          </div>
        ) : null}

        {/* regions of interest, revealed after scanning */}
        {!scanning &&
          regions.map((r, i) => (
            <div
              key={i}
              className="absolute rounded-[2px] animate-panel-in"
              style={{
                left: `${r.x * 100}%`,
                top: `${r.y * 100}%`,
                width: `${r.w * 100}%`,
                height: `${r.h * 100}%`,
                border: `2px solid ${boxColor}`,
                boxShadow: `0 0 0 1px rgb(10 14 26 / 0.5), 0 0 18px -4px ${boxColor}`,
              }}
            >
              <span
                className="absolute -top-[1px] left-0 -translate-y-full whitespace-nowrap rounded-t-[2px] px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-onaccent"
                style={{ background: boxColor }}
              >
                {Math.round(r.score * 100)}%
              </span>
            </div>
          ))}
      </div>

      {label ? (
        <div className="flex items-center justify-between border-t border-line px-3 py-1.5">
          <span className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-fg-faint">
            {label}
          </span>
          {!scanning && regions.length > 0 ? (
            <span className="shrink-0 font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-signal-300">
              {regions.length} {t("analysis.regions")}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Four instrument-style corner brackets. */
function Corners() {
  const base = "pointer-events-none absolute h-5 w-5 border-signal-400/70";
  return (
    <>
      <span aria-hidden="true" className={cn(base, "left-2 top-2 border-l-2 border-t-2")} />
      <span aria-hidden="true" className={cn(base, "right-2 top-2 border-r-2 border-t-2")} />
      <span aria-hidden="true" className={cn(base, "bottom-2 left-2 border-b-2 border-l-2")} />
      <span aria-hidden="true" className={cn(base, "bottom-2 right-2 border-b-2 border-r-2")} />
    </>
  );
}
