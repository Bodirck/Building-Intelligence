import { useId, useRef, useState, type DragEvent } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import { CodeLabel } from "../ui";

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
}

/**
 * The intake control: a large dashed drop target with a styled file picker. Mirrors
 * the SECO ingest pattern — radio-free, image-only — using the instrument chrome
 * (dot-grid hint, signal accent on drag-over, Oswald code label).
 */
export default function Dropzone({ onFile, disabled }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  function pick(files: FileList | null) {
    const file = files?.[0];
    if (file && file.type.startsWith("image/")) onFile(file);
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    pick(e.dataTransfer.files);
  }

  return (
    <label
      htmlFor={inputId}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "group relative flex min-h-[300px] cursor-pointer flex-col items-center justify-center gap-4 rounded-sm border-2 border-dashed px-6 py-12 text-center transition-colors duration-150",
        "focus-within:ring-2 focus-within:ring-signal-400/70",
        dragging
          ? "border-signal-400 bg-signal-500/5"
          : "border-line-strong bg-ink-850 hover:border-signal-400/60",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      {/* faint dot-grid wash inside the target */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-sm opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgb(var(--grid-dot) / 0.06) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <span
        aria-hidden="true"
        className={cn(
          "relative flex h-14 w-14 items-center justify-center rounded-sm border text-signal-300 transition-colors",
          dragging ? "border-signal-400 bg-signal-500/15" : "border-signal-500/40 bg-signal-500/10",
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
          <path d="M12 16V4M12 4 7.5 8.5M12 4l4.5 4.5" />
          <path d="M4 14v3.5A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5V14" />
        </svg>
      </span>

      <div className="relative">
        <CodeLabel className="block">{t("analysis.scanRef")} // INTAKE</CodeLabel>
        <p className="mt-1 font-display text-lg font-semibold uppercase tracking-wide text-fg">
          {dragging ? t("analysis.dragActive") : t("analysis.dropTitle")}
        </p>
        <p className="mt-1 max-w-sm text-sm text-fg-muted">{t("analysis.dropHint")}</p>
      </div>

      <span className="relative inline-flex h-9 items-center rounded-lg bg-signal-500 px-4 font-display text-xs font-semibold uppercase tracking-wide text-onaccent transition group-hover:bg-signal-400 group-hover:shadow-signal">
        {t("analysis.dropCta")}
      </span>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/png,image/jpeg"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => pick(e.target.files)}
      />
    </label>
  );
}
