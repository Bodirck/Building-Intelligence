import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer, Tooltip as LeafletTooltip } from "react-leaflet";
import type { StructureSummary } from "../../api/types";
import { cn } from "../../lib/cn";
import { riskHex } from "../../lib/risk";
import { useTheme } from "../../theme/ThemeProvider";

interface Props {
  structures: StructureSummary[];
  className?: string;
}

/**
 * Read-only locator map of the supervised structures across Luxembourg. CircleMarkers
 * (no image assets, avoiding the Leaflet/Vite icon issue) are colored by each
 * structure's risk band. Dark/light CARTO basemap follows the theme; scroll-zoom is
 * off so the map never traps page scroll. Lazy-imported to keep leaflet out of the
 * entry chunk.
 */
export default function StructureMap({ structures, className }: Props) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const tileUrl = isLight
    ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const mapBg = isLight ? "#FFFFFF" : "#0A0E1A";

  const pts = structures.filter((s) => s.lat != null && s.lon != null);

  return (
    <div className={cn("overflow-hidden rounded-sm border border-line", className ?? "h-[420px]")}>
      <MapContainer
        key={theme}
        center={[49.69, 6.13]}
        zoom={9}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", background: mapBg }}
      >
        <TileLayer
          url={tileUrl}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        {pts.map((s) => {
          const color = riskHex(s.risk_score);
          return (
            <CircleMarker
              key={s.id}
              center={[s.lat as number, s.lon as number]}
              radius={7 + Math.round(s.risk_score / 18)}
              pathOptions={{ color, weight: 2, fillColor: color, fillOpacity: 0.45 }}
            >
              <LeafletTooltip>
                <span style={{ fontWeight: 600 }}>{s.name}</span> — risk {s.risk_score}
              </LeafletTooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
