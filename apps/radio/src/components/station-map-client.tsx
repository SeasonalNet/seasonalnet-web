"use client";
// src/components/station-map-client.tsx
//
// Actual Leaflet map — imported only client-side via station-map.tsx.
// Renders:
//   1. Base map (OpenStreetMap or CartoDB dark)
//   2. County fills for station-handled / no-geometry alerts
//   3. CAP polygon outlines for NWS alerts with geometry
//   4. Hatch overlay where both overlap

import { useEffect, useRef, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import type { Layer as LeafletLayer, Map as LeafletMap, TileLayer as LeafletTileLayer } from "leaflet";
import type { NwsAlertFeature, StationHandledAlert } from "@/lib/alert-map-utils";
import {
  capPolygonStyle,
  countyFillStyle,
  overlappingCountyStyle,
  expandFipsCode,
  fipsFromAlert,
  fipsFromCoverageRef,
  marineZonesFromAlert,
  sameToCoverageRef,
  sameToFips,
  sameToMarineZone,
  toLeafletStyle,
  SEVERITY_COLORS,
  deriveAlertSeverity,
  type NwsSeverity,
} from "@/lib/alert-map-utils";
import type { StationAlertConfig } from "@/lib/station-alert-config";

// ---------------------------------------------------------------------------
// Tile layer URLs — swapped on theme change
// ---------------------------------------------------------------------------
const TILE_URLS = {
  dark:  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
} as const;

const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CountyFeature {
  type: "Feature";
  properties: { GEOID: string; NAME: string };
  geometry: GeoJSON.Geometry;
}

interface CountyFeatureCollection {
  type: "FeatureCollection";
  features: CountyFeature[];
}

interface MarineZoneFeature {
  type: "Feature";
  properties: {
    ID: string;
    NAME?: string;
    WFO?: string;
    GL_WFO?: string;
  };
  geometry: GeoJSON.Geometry;
}

interface MarineZoneFeatureCollection {
  type: "FeatureCollection";
  features: MarineZoneFeature[];
}

interface Props {
  config: StationAlertConfig;
  capAlerts: NwsAlertFeature[];
  handledAlerts: StationHandledAlert[];
  /** Path to the pre-baked filtered county GeoJSON. Defaults to /counties-filtered.json */
  countiesUrl?: string;
  /** Path to the pre-baked filtered marine-zone GeoJSON. Defaults to /marine-zones-filtered.json */
  marineZonesUrl?: string;
}

// State FIPS → abbreviation (only the states in this service area need be exhaustive,
// but a full table avoids surprises if SAME codes are ever expanded)
const STATE_FIPS_ABBR: Record<string, string> = {
  "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT",
  "10":"DE","11":"DC","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL",
  "18":"IN","19":"IA","20":"KS","21":"KY","22":"LA","23":"ME","24":"MD",
  "25":"MA","26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE",
  "32":"NV","33":"NH","34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND",
  "39":"OH","40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD",
  "47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA","54":"WV",
  "55":"WI","56":"WY",
};


// ---------------------------------------------------------------------------
const SERVICE_AREA_BOUNDS: Record<string, [[number, number], [number, number]]> = {
  // DC / MD / VA / WV / PA region
  default: [[37.0, -82.0], [40.5, -74.5]],
};

const MAP_ASSET_TIMEOUT_MS = 8_000;

function tooltipContent(lines: Array<{ text: string; strong?: boolean }>): HTMLElement {
  const content = document.createElement("span");

  lines.forEach((line, index) => {
    if (index > 0) content.append(document.createElement("br"));
    const node = line.strong ? document.createElement("strong") : document.createTextNode(line.text);
    if (line.strong) node.textContent = line.text;
    content.append(node);
  });

  return content;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function StationMapClient({
  config,
  capAlerts,
  handledAlerts,
  countiesUrl = "/counties-filtered.json",
  marineZonesUrl = "/marine-zones-filtered.json",
}: Props) {
  const mapRef    = useRef<LeafletMap | null>(null);
  const layersRef = useRef<LeafletLayer[]>([]);
  const tileLayerRef = useRef<LeafletTileLayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [overlayError, setOverlayError] = useState(false);
  const { resolvedTheme } = useTheme();

  // Station's own FIPS set (the counties this station covers at all)
  const stationFipsSet = useMemo<Set<string>>(() => {
    const s = new Set<string>();
    for (const sc of config.sameCodes) {
      const f = sameToFips(sc);
      if (f) s.add(f);
    }
    return s;
  }, [config.sameCodes]);

  const stationMarineZoneSet = useMemo<Set<string>>(() => {
    const s = new Set<string>();
    for (const sc of config.sameCodes) {
      const z = sameToMarineZone(sc);
      if (z) s.add(z);
    }
    return s;
  }, [config.sameCodes]);

  // -------------------------------------------------------------------------
  // Map initialisation (once)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    let cancelled = false;
    let createdMap: LeafletMap | null = null;

    // Dynamic import — avoids SSR window errors
    import("leaflet").then(L => {
      if (cancelled) return;

      // Remove Leaflet's legacy URL inference before providing explicit assets.
      Reflect.deleteProperty(L.Icon.Default.prototype, "_getIconUrl");
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const bounds = SERVICE_AREA_BOUNDS.default;
      const map = L.map(container, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: "center",
      }).fitBounds(bounds);
      createdMap = map;

      // CartoDB tiles — theme-aware, swapped via tileLayerRef
      tileLayerRef.current = L.tileLayer(
        TILE_URLS[document.documentElement.classList.contains("dark") ? "dark" : "light"],
        {
          attribution: TILE_ATTRIBUTION,
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      mapRef.current = map;
      setMapReady(true);
    }).catch(() => {
      if (!cancelled) setMapError(true);
    });

    return () => {
      cancelled = true;
      createdMap?.remove();
      if (mapRef.current === createdMap) {
        mapRef.current = null;
        tileLayerRef.current = null;
      }
    };
  }, []);

  // -------------------------------------------------------------------------
  // Swap tile layer when theme changes (no map reinit needed)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const tile = tileLayerRef.current;
    if (!tile) return;
    tile.setUrl(TILE_URLS[resolvedTheme === "light" ? "light" : "dark"]);
  }, [resolvedTheme]);

  // -------------------------------------------------------------------------
  // Draw / redraw alert layers whenever alerts change
  // -------------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let cancelled = false;
    setOverlayError(false);

    import("leaflet").then(async L => {
      if (cancelled) return;

      // Remove previous alert layers
      for (const layer of layersRef.current) layer.remove();
      layersRef.current = [];

      // -----------------------------------------------------------------------
      // 1. Fetch county + marine-zone GeoJSON assets
      // -----------------------------------------------------------------------
      let counties: CountyFeatureCollection | null = null;
      let marineZones: MarineZoneFeatureCollection | null = null;

      try {
        const res = await fetch(countiesUrl, { signal: AbortSignal.timeout(MAP_ASSET_TIMEOUT_MS) });
        if (res.ok) counties = await res.json();
      } catch { /* county outlines will be skipped */ }

      try {
        const res = await fetch(marineZonesUrl, { signal: AbortSignal.timeout(MAP_ASSET_TIMEOUT_MS) });
        if (res.ok) marineZones = await res.json();
      } catch { /* marine zone outlines will be skipped */ }

      if (cancelled) return;

      // -----------------------------------------------------------------------
      // 2. Determine the dominant severity per FIPS code across active alerts
      //    (for county-fill: no-geometry alerts + handled alerts)
      // -----------------------------------------------------------------------
      const severityRank: Record<NwsSeverity, number> = {
        Extreme: 4, Severe: 3, Moderate: 2, Minor: 1, Unknown: 0,
      };

      const fipsDominantSeverity = new Map<string, NwsSeverity>();
      const marineDominantSeverity = new Map<string, NwsSeverity>();

      function upgradeSeverity(map: Map<string, NwsSeverity>, id: string, sev: NwsSeverity) {
        const cur = map.get(id);
        if (!cur || severityRank[sev] > severityRank[cur]) {
          map.set(id, sev);
        }
      }

      // CAP alerts without geometry → county fill.
      // Route through deriveAlertSeverity to catch known NWS CAP misclassifications
      // (e.g. Tornado Watch shipped as severity="Extreme").
      for (const alert of capAlerts) {
        if (alert.geometry) continue; // polygon alerts handled later
        const sev = deriveAlertSeverity(alert.properties.event, alert.properties.severity);
        fipsFromAlert(alert, stationFipsSet).forEach((f) => upgradeSeverity(fipsDominantSeverity, f, sev));
        marineZonesFromAlert(alert).forEach((z) => upgradeSeverity(marineDominantSeverity, z, sev));
      }

      // Station-handled alerts (NWWS-OI, ERN/GWES, originated).
      // deriveAlertSeverity: passes CAP severity through unchanged when real;
      // maps event name → severity tier when source is Unknown (NWWS-OI/ERN).
      for (const alert of handledAlerts) {
        const sev = deriveAlertSeverity(alert.eventType, alert.severity);

        for (const sc of alert.sameCodes ?? []) {
          const ref = sameToCoverageRef(sc);
          if (!ref) continue;

          if (ref.kind === "marineZone") {
            upgradeSeverity(marineDominantSeverity, ref.id, sev);
          } else {
            for (const fips of fipsFromCoverageRef(ref, stationFipsSet)) {
              upgradeSeverity(fipsDominantSeverity, fips, sev);
            }
          }
        }

        for (const f of alert.fipsCodes ?? []) {
          for (const fips of expandFipsCode(f, stationFipsSet)) {
            upgradeSeverity(fipsDominantSeverity, fips, sev);
          }
        }
      }

      // -----------------------------------------------------------------------
      // 3. Which FIPS have BOTH a CAP polygon AND a county fill?
      // -----------------------------------------------------------------------
      const capPolygonFips = new Set<string>();
      const capPolygonMarineZones = new Set<string>();

      for (const alert of capAlerts) {
        if (!alert.geometry) continue;
        fipsFromAlert(alert, stationFipsSet).forEach((f) => capPolygonFips.add(f));
        marineZonesFromAlert(alert).forEach((z) => capPolygonMarineZones.add(z));
      }
      // -----------------------------------------------------------------------
      // 4. Draw county fills
      // -----------------------------------------------------------------------
      if (counties && fipsDominantSeverity.size > 0) {
        const fillLayer = L.geoJSON<CountyFeature["properties"]>(counties, {
          filter: (feature) => {
            return fipsDominantSeverity.has(feature.properties.GEOID);
          },
          style: (feature) => {
            const fips = feature?.properties.GEOID ?? "";
            const sev  = fipsDominantSeverity.get(fips) ?? "Unknown";
            // Overlap → hatch style (dashed stroke, no fill — pattern is CSS bg)
            const style = capPolygonFips.has(fips)
              ? overlappingCountyStyle(sev)
              : countyFillStyle(sev);
            return toLeafletStyle(style);
          },
          onEachFeature: (feature, layer) => {
            const fips = feature.properties.GEOID;
            const sev  = fipsDominantSeverity.get(fips) ?? "Unknown";
            const state = STATE_FIPS_ABBR[fips.slice(0, 2)] ?? fips.slice(0, 2);
            layer.bindTooltip(
              tooltipContent([
                { text: `${feature.properties.NAME}, ${state}`, strong: true },
                { text: `Severity: ${sev}` },
              ]),
              { sticky: true }
            );
          },
        }).addTo(map);
        layersRef.current.push(fillLayer);
      }

      // -----------------------------------------------------------------------
      // 5. Draw marine-zone fills
      // -----------------------------------------------------------------------
      if (marineZones && marineDominantSeverity.size > 0) {
        const marineFillLayer = L.geoJSON<MarineZoneFeature["properties"]>(marineZones, {
          filter: (feature) => {
            return marineDominantSeverity.has(String(feature.properties.ID));
          },
          style: (feature) => {
            const zoneId = String(feature?.properties.ID ?? "");
            const sev = marineDominantSeverity.get(zoneId) ?? "Unknown";
            const style = capPolygonMarineZones.has(zoneId)
              ? overlappingCountyStyle(sev)
              : countyFillStyle(sev);
            return toLeafletStyle(style);
          },
          onEachFeature: (feature, layer) => {
            const zoneId = String(feature.properties.ID);
            const sev = marineDominantSeverity.get(zoneId) ?? "Unknown";
            const name = String(feature.properties.NAME ?? zoneId);
            layer.bindTooltip(
              tooltipContent([
                { text: name, strong: true },
                { text: `Zone: ${zoneId}` },
                { text: `Severity: ${sev}` },
              ]),
              { sticky: true }
            );
          },
        }).addTo(map);

        layersRef.current.push(marineFillLayer);
      }

      // -----------------------------------------------------------------------
      // 6. Draw CAP polygon outlines (alerts that ship geometry)
      // -----------------------------------------------------------------------
      for (const alert of capAlerts) {
        if (!alert.geometry) continue;
        const sev = deriveAlertSeverity(alert.properties.event, alert.properties.severity);
        const style = toLeafletStyle(capPolygonStyle(sev));

        const feature: GeoJSON.Feature<GeoJSON.Geometry, Record<string, never>> = {
          type: "Feature",
          geometry: alert.geometry,
          properties: {},
        };
        const polyLayer = L.geoJSON<Record<string, never>>(
          feature,
          {
            style: () => style,
            onEachFeature: (_feature, layer) => {
              layer.bindTooltip(
                tooltipContent([
                  { text: alert.properties.event, strong: true },
                  { text: alert.properties.areaDesc },
                ]),
                { sticky: true }
              );
            },
          }
        ).addTo(map);

        layersRef.current.push(polyLayer);
      }

      // -----------------------------------------------------------------------
      // 7. Draw service-area marine-zone outlines (subtle, always visible)
      // -----------------------------------------------------------------------
      if (marineZones) {
        const marineOutlineLayer = L.geoJSON<MarineZoneFeature["properties"]>(marineZones, {
          filter: (feature) => {
            return stationMarineZoneSet.has(String(feature.properties.ID));
          },
          style: () => ({
            color: resolvedTheme === "light" ? "#475569" : "#94a3b8",
            weight: 1,
            fillOpacity: 0,
            opacity: 0.45,
          }),
          interactive: false,
        }).addTo(map);

        layersRef.current.push(marineOutlineLayer);
      }

      // -----------------------------------------------------------------------
      // 8. Draw service-area county outlines (subtle, always visible)
      // -----------------------------------------------------------------------
      if (counties) {
        const outlineLayer = L.geoJSON<CountyFeature["properties"]>(counties, {
          filter: (feature) =>
            stationFipsSet.has(feature.properties.GEOID) &&
            !fipsDominantSeverity.has(feature.properties.GEOID),
          style: () => ({
            fillOpacity: 0,
            color: "#475569",
            weight: 0.75,
            dashArray: "3 4",
          }),
        }).addTo(map);
        layersRef.current.push(outlineLayer);
      }
    }).catch(() => {
      if (!cancelled) setOverlayError(true);
    });

    return () => { cancelled = true; };
  }, [capAlerts, handledAlerts, countiesUrl, mapReady, marineZonesUrl, resolvedTheme, stationFipsSet, stationMarineZoneSet]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="relative w-full rounded-md overflow-hidden border border-border" style={{ isolation: "isolate" }}>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />

      {/* Map container — explicit height required for Leaflet */}
      <div
        ref={containerRef}
        style={{ height: 340, background: "#0f172a" }}
        aria-label={`Service area map for ${config.serviceAreaName}`}
      />

      {mapError ? (
        <div className="absolute inset-0 z-[1001] grid place-items-center bg-background/95 p-6 text-center text-sm text-muted-foreground">
          The service-area map could not be loaded. Alert details remain available above.
        </div>
      ) : null}

      {overlayError && !mapError ? (
        <div className="absolute bottom-7 left-3 z-[1001] max-w-[calc(100%-1.5rem)] rounded-md border border-border bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow-sm">
          Alert overlays could not be drawn. Alert details remain available above.
        </div>
      ) : null}

      {/* Severity legend — top-right avoids Leaflet attribution at bottom-right */}
      <div className="absolute top-3 right-3 z-[1000] bg-background/90 backdrop-blur-sm border border-border rounded-md px-2.5 py-2 text-xs space-y-1 pointer-events-none">
        {(Object.entries(SEVERITY_COLORS) as [NwsSeverity, { fill: string }][]).map(
          ([sev, { fill }]) => (
            <div key={sev} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded-sm border border-white/20"
                style={{ background: fill }}
              />
              <span className="text-muted-foreground">{sev}</span>
            </div>
          )
        )}
        <div className="flex items-center gap-1.5 pt-0.5 border-t border-border">
          <span className="inline-block w-3 h-3 rounded-sm border border-slate-500 bg-transparent" style={{ borderStyle: "dashed" }} />
          <span className="text-muted-foreground">Overlap</span>
        </div>
      </div>
    </div>
  );
}
