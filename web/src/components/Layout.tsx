import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, useLocation } from "react-router-dom";
import { api } from "../api/client";
import { Badge, Tooltip } from "./ui";
import { useTheme } from "../theme/ThemeProvider";

/** Primary navigation — the two screens the product is built around. */
const NAV_ITEMS: { to: string; key: string }[] = [
  { to: "/", key: "nav.analysis" },
  { to: "/portfolio", key: "nav.portfolio" },
];

/**
 * Terminal-tab nav item: Oswald uppercase, strongly tracked. Active gets the signal
 * accent with a boxed ink-800 highlight and an underline rule; idle stays muted and
 * warms to fg on hover.
 */
const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  "relative rounded-sm px-2 py-1 font-display text-xs font-medium uppercase tracking-[0.18em] " +
  "cursor-pointer transition-colors duration-150 " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-400/70 " +
  (isActive
    ? "bg-ink-800 text-signal-300 ring-1 ring-inset ring-signal-500/40 border-b-2 border-signal-500"
    : "border-b-2 border-transparent text-fg-muted hover:text-fg");

/**
 * Header chip showing the effective defect-sheet engine. In demo / mock mode it
 * carries a major-toned dot to flag that sheets are not coming from a live LLM.
 * Fetched once on mount via api.meta.
 */
function ProviderChip() {
  const { t } = useTranslation();
  const [provider, setProvider] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .meta()
      .then((meta) => {
        if (active) setProvider(meta.provider);
      })
      .catch(() => {
        // Stay silent: the chip simply does not render if meta is unavailable.
      });
    return () => {
      active = false;
    };
  }, []);

  if (!provider) return null;

  const isMock = provider === "mock";
  const tooltip = isMock ? t("provider.mockTooltip") : t("provider.tooltip", { provider });
  const label = isMock ? t("provider.mockLabel") : provider;

  return (
    <Tooltip label={tooltip}>
      <span aria-label={`${t("provider.label")}: ${label}`}>
        <Badge tone={isMock ? "major" : "signal"}>
          <span className="flex items-center gap-1.5">
            {isMock ? <span className="h-1.5 w-1.5 rounded-full bg-major" aria-hidden="true" /> : null}
            {label}
          </span>
        </Badge>
      </span>
    </Tooltip>
  );
}

/** Light/dark theme toggle. Shows the icon of the theme you would switch TO. */
function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("common.theme")}
      title={t("common.theme")}
      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-fg-faint transition-colors duration-150 hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-400/70"
    >
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      )}
    </button>
  );
}

const SECTOR_BY_PATH: Record<string, string> = {
  "/": "01",
  "/portfolio": "02",
};

function sectorForPath(pathname: string): string {
  return SECTOR_BY_PATH[pathname] ?? "01";
}

export default function Layout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const sectorCode = sectorForPath(pathname);

  return (
    <div className="flex min-h-screen flex-col">
      {/* HUD command bar: wordmark, status strip, terminal-tab nav. */}
      <header className="sticky top-0 z-20 border-b border-line-strong bg-ink-900/85 backdrop-blur">
        {/* Thin accent rule along the very top edge, pure chrome. */}
        <span aria-hidden="true" className="block h-px w-full bg-signal-500/60" />
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="group flex items-center gap-2 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-400/70"
            >
              {/* Dossier glyph: a bracketed structure with a crack line. */}
              <span
                aria-hidden="true"
                className="flex h-6 w-6 items-center justify-center rounded-sm border border-signal-500/50 bg-signal-500/10 text-signal-300"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                  <rect x="2" y="2" width="10" height="10" rx="0.6" stroke="currentColor" strokeWidth="1.1" />
                  <path d="M4 4.5 L6.4 7 L5.3 8.4 L7.8 10.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="font-display text-base font-semibold uppercase tracking-[0.14em] text-fg transition-colors duration-150 group-hover:text-signal-300 sm:text-lg">
                Building<span className="text-signal-500">&nbsp;Intelligence</span>
              </span>
            </Link>
            <ProviderChip />
          </div>
          <nav className="flex items-center gap-1.5">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === "/"} className={navLinkClass}>
                {t(item.key)}
              </NavLink>
            ))}
            <span aria-hidden="true" className="mx-1 h-4 w-px bg-line-strong" />
            <ThemeToggle />
          </nav>
        </div>
        {/* Faint technical sub-bar: decorative codes, chrome only. */}
        <div className="mx-auto hidden max-w-6xl items-center gap-3 border-t border-line px-4 py-1 sm:flex">
          <span className="font-display text-[10px] font-medium uppercase tracking-[0.18em] text-signal-300/80">
            Building Intelligence Terminal
          </span>
          <span aria-hidden="true" className="font-mono text-[10px] tracking-[0.18em] text-fg-faint">
            // SESSION: INSPECTOR // SECTOR {sectorCode}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

      {/* Faint technical micro-text footer. */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-4 py-4 sm:flex-row sm:items-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-faint">
            {t("footer.tagline")}
          </p>
          <a
            href="https://github.com/Bodirck/Building-Intelligence"
            target="_blank"
            rel="noreferrer"
            className="rounded-sm font-display text-[10px] font-medium uppercase tracking-[0.18em] text-fg-faint cursor-pointer transition-colors duration-150 hover:text-signal-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-400/70"
          >
            {t("footer.repo")}
          </a>
        </div>
      </footer>
    </div>
  );
}
