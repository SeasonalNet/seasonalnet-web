"use client";
// src/components/station-map-client.tsx
//
// Actual Leaflet map — imported only client-side via station-map.tsx.
// Renders:
//   1. OpenFreeMap vector basemap rendered through MapLibre GL
//   2. County fills for station-handled / no-geometry alerts
//   3. CAP polygon outlines for NWS alerts with geometry
//   4. Hatch overlay where both overlap

import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import type { Layer as LeafletLayer, Map as LeafletMap, Path as LeafletPath, PathOptions } from "leaflet";
import type { NwsAlertFeature, StationHandledAlert } from "@/lib/alert-map-utils";
import {
  capPolygonStyle,
  assembleAlertProductText,
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
import type {
  RadarProductId,
  RadarSourceId,
  StationAlertConfig,
} from "@/lib/station-alert-config";
import { StationMapControls } from "@/components/station-map-controls";
import {
  StationMapSelection,
  type MapAlertSummary,
  type MapSelection,
} from "@/components/station-map-selection";

// ---------------------------------------------------------------------------
// OpenFreeMap vector styles — swapped on theme change.
// ---------------------------------------------------------------------------
const BASEMAP_STYLE_URLS = {
  dark:  "https://tiles.openfreemap.org/styles/dark",
  light: "https://tiles.openfreemap.org/styles/positron",
} as const;

const BASEMAP_ATTRIBUTION =
  '&copy; <a href="https://openfreemap.org/">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

type MapLibreLeafletLayer = LeafletLayer & {
  getMaplibreMap: () => import("maplibre-gl").Map;
};

type LeafletLayerWithOptionalPathApi = LeafletLayer & {
  eachLayer?: (callback: (layer: LeafletLayer) => void) => void;
  getBounds?: () => import("leaflet").LatLngBounds;
  getElement?: () => SVGElement | null;
  setStyle?: (style: PathOptions) => void;
};

type InteractiveMapLayer = {
  kind: "county" | "marine" | "alert";
  id: string;
  layer: LeafletLayer;
  style: PathOptions;
};

const RADAR_LAYER_ID = "seasonalnet-radar";

function forEachLeafletPath(layer: LeafletLayer, callback: (path: LeafletPath) => void): void {
  const candidate = layer as LeafletLayerWithOptionalPathApi;
  if (candidate.setStyle && candidate.getElement) {
    callback(candidate as unknown as LeafletPath);
    return;
  }
  candidate.eachLayer?.((child) => forEachLeafletPath(child, callback));
}

function formatMapTime(value: string | undefined): string {
  if (!value) return "";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "";
  return new Intl.DateTimeFormat([], { dateStyle: "short", timeStyle: "short" }).format(timestamp);
}

function capSummary(alert: NwsAlertFeature): MapAlertSummary {
  return {
    id: alert.id,
    kind: "nws",
    label: alert.properties.event,
    severity: deriveAlertSeverity(alert.properties.event, alert.properties.severity),
    area: alert.properties.areaDesc,
    headline: assembleAlertProductText(alert.properties),
    until: formatMapTime(alert.properties.expires),
    source: "NWS",
  };
}

function handledSummary(alert: StationHandledAlert): MapAlertSummary {
  return {
    id: alert.id,
    kind: "station",
    label: alert.eventType,
    severity: deriveAlertSeverity(alert.eventType, alert.severity),
    area: alert.areaDesc ?? "",
    headline: alert.headline,
    until: formatMapTime(alert.expires),
    source: alert.source ?? "Station feed",
  };
}

function basemapStyleUrl(theme: string | undefined): string {
  return BASEMAP_STYLE_URLS[theme === "light" ? "light" : "dark"];
}

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

type MapPreferences = {
  radarSource?: RadarSourceId;
  radarProduct?: RadarProductId;
  radarVisible?: boolean;
  radarOpacity?: number;
  freshnessCues?: boolean;
  reducedMotion?: boolean;
};

function readMapPreferences(stationId: string): MapPreferences {
  if (typeof window === "undefined") return {};
  try {
    return (JSON.parse(window.localStorage.getItem(`radio-map-preferences:${stationId}`) ?? "null") as MapPreferences | null) ?? {};
  } catch {
    return {};
  }
}

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
  const mapLibreMapRef = useRef<import("maplibre-gl").Map | null>(null);
  const layersRef = useRef<LeafletLayer[]>([]);
  const basemapLayerRef = useRef<MapLibreLeafletLayer | null>(null);
  const interactiveLayersRef = useRef<Map<string, InteractiveMapLayer>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [overlayError, setOverlayError] = useState(false);
  const [layersRevision, setLayersRevision] = useState(0);
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [radarSource, setRadarSource] = useState<RadarSourceId>(config.radar.defaultSource);
  const [radarProduct, setRadarProduct] = useState<RadarProductId>(config.radar.defaultProduct);
  const [radarVisible, setRadarVisible] = useState(false);
  const [radarOpacity, setRadarOpacity] = useState(0.45);
  const [freshnessCues, setFreshnessCues] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [freshAlertIds, setFreshAlertIds] = useState<Set<string>>(new Set());
  const knownAlertVersionsRef = useRef<Map<string, string>>(new Map());
  const hasAlertBaselineRef = useRef(false);
  const preferencesLoadedRef = useRef(false);
  const { resolvedTheme } = useTheme();

  const radarSourceConfig = config.radar.sources[radarSource];
  const effectiveRadarProduct = radarSourceConfig.products[radarProduct]
    ? radarProduct
    : (config.radar.defaultProduct in radarSourceConfig.products
      ? config.radar.defaultProduct
      : "reflectivity");
  const radarProductConfig = radarSourceConfig.products[effectiveRadarProduct];

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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const saved = readMapPreferences(config.stationId);
      if (saved.radarSource && config.radar.sources[saved.radarSource]) setRadarSource(saved.radarSource);
      if (saved.radarProduct) setRadarProduct(saved.radarProduct);
      if (typeof saved.radarVisible === "boolean") setRadarVisible(saved.radarVisible);
      if (typeof saved.radarOpacity === "number") setRadarOpacity(Math.min(0.6, Math.max(0.3, saved.radarOpacity)));
      if (typeof saved.freshnessCues === "boolean") setFreshnessCues(saved.freshnessCues);
      if (typeof saved.reducedMotion === "boolean") {
        setReducedMotion(saved.reducedMotion);
      } else {
        setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      }
      preferencesLoadedRef.current = true;
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [config.radar.sources, config.stationId]);

  useEffect(() => {
    if (!preferencesLoadedRef.current) return;
    const key = `radio-map-preferences:${config.stationId}`;
    try {
      window.localStorage.setItem(key, JSON.stringify({
        radarSource,
        radarProduct,
        radarVisible,
        radarOpacity,
        freshnessCues,
        reducedMotion,
      }));
    } catch {
      // Preferences are optional; map behavior must not depend on storage.
    }
  }, [config.stationId, freshnessCues, radarOpacity, radarProduct, radarSource, radarVisible, reducedMotion]);

  const alertsForCounty = useCallback((fips: string): MapAlertSummary[] => {
    const summaries: MapAlertSummary[] = [];
    capAlerts.forEach((alert) => {
      if (fipsFromAlert(alert, stationFipsSet).includes(fips)) summaries.push(capSummary(alert));
    });
    handledAlerts.forEach((alert) => {
      const sameFips = (alert.sameCodes ?? []).flatMap((same) =>
        fipsFromCoverageRef(sameToCoverageRef(same), stationFipsSet)
      );
      const directFips = (alert.fipsCodes ?? []).flatMap((code) => expandFipsCode(code, stationFipsSet));
      if (sameFips.includes(fips) || directFips.includes(fips)) summaries.push(handledSummary(alert));
    });
    return summaries;
  }, [capAlerts, handledAlerts, stationFipsSet]);

  const alertsForMarineZone = useCallback((zoneId: string): MapAlertSummary[] => {
    const summaries: MapAlertSummary[] = [];
    capAlerts.forEach((alert) => {
      if (marineZonesFromAlert(alert).includes(zoneId)) summaries.push(capSummary(alert));
    });
    handledAlerts.forEach((alert) => {
      if ((alert.sameCodes ?? []).some((same) => sameToMarineZone(same) === zoneId)) {
        summaries.push(handledSummary(alert));
      }
    });
    return summaries;
  }, [capAlerts, handledAlerts]);

  // -------------------------------------------------------------------------
  // Map initialisation (once)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    let cancelled = false;
    let createdMap: LeafletMap | null = null;

    // Dynamic imports — avoid SSR window errors and defer the vector renderer
    // until the map is actually shown.
    Promise.all([
      import("leaflet"),
      import("maplibre-gl"),
      import("@maplibre/maplibre-gl-leaflet"),
    ]).then(([L, maplibregl, { maplibreGL }]) => {
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

      map.on("click", () => setSelection(null));
      map.on("dragstart", () => setSelection(null));

      // MapLibre GL's Next.js worker is copied to public/ by predev/prebuild.
      maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

      basemapLayerRef.current = maplibreGL({
        style: basemapStyleUrl(document.documentElement.classList.contains("dark") ? "dark" : "light"),
        attributionControl: { customAttribution: BASEMAP_ATTRIBUTION },
      }).addTo(map) as MapLibreLeafletLayer;
      mapLibreMapRef.current = basemapLayerRef.current.getMaplibreMap();

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
        mapLibreMapRef.current = null;
        basemapLayerRef.current = null;
      }
    };
  }, []);

  // -------------------------------------------------------------------------
  // Swap vector style when theme changes (no map reinit needed)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const basemap = basemapLayerRef.current;
    if (!basemap) return;
    basemap.getMaplibreMap().setStyle(basemapStyleUrl(resolvedTheme));
  }, [resolvedTheme]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelection(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const alertVersions = useMemo(() => {
    const versions = new Map<string, string>();
    capAlerts.forEach((alert) => {
      versions.set(`nws:${alert.id}`, JSON.stringify([
        alert.properties.event,
        alert.properties.nwsHeadline,
        alert.properties.headline,
        alert.properties.description,
        alert.properties.instruction,
        alert.properties.effective,
        alert.properties.expires,
        alert.properties.parameters?.SAME,
      ]));
    });
    handledAlerts.forEach((alert) => {
      versions.set(`station:${alert.id}`, JSON.stringify([
        alert.eventType,
        alert.severity,
        alert.areaDesc,
        alert.effective,
        alert.expires,
        alert.sameCodes,
        alert.fipsCodes,
      ]));
    });
    return versions;
  }, [capAlerts, handledAlerts]);

  useEffect(() => {
    const prior = knownAlertVersionsRef.current;
    const changed = hasAlertBaselineRef.current
      ? Array.from(alertVersions.keys()).filter((key) => prior.get(key) !== alertVersions.get(key))
      : [];
    knownAlertVersionsRef.current = alertVersions;
    hasAlertBaselineRef.current = true;

    if (!freshnessCues || reducedMotion || changed.length === 0) {
      if (!freshnessCues || reducedMotion) {
        const timeoutId = window.setTimeout(() => setFreshAlertIds(new Set()), 0);
        return () => window.clearTimeout(timeoutId);
      }
      return;
    }

    const addTimeoutId = window.setTimeout(() => setFreshAlertIds((current) => new Set([...current, ...changed])), 0);
    const removeTimeoutId = window.setTimeout(() => {
      setFreshAlertIds((current) => {
        const next = new Set(current);
        changed.forEach((key) => next.delete(key));
        return next;
      });
    }, 5_000);
    return () => {
      window.clearTimeout(addTimeoutId);
      window.clearTimeout(removeTimeoutId);
    };
  }, [alertVersions, freshnessCues, reducedMotion]);

  const fitLayer = useCallback((layer: LeafletLayer | undefined) => {
    const map = mapRef.current;
    const bounds = layer && (layer as LeafletLayerWithOptionalPathApi).getBounds?.();
    if (!map || !bounds || !bounds.isValid()) return;
    map.fitBounds(bounds, {
      padding: [28, 28],
      maxZoom: 10,
      animate: !reducedMotion,
      duration: 0.55,
    });
  }, [reducedMotion]);

  const fitLayers = useCallback((layers: LeafletLayer[]) => {
    const map = mapRef.current;
    const bounds = layers
      .map((layer) => (layer as LeafletLayerWithOptionalPathApi).getBounds?.())
      .find((candidate) => candidate?.isValid());
    if (!map || !bounds || !bounds.isValid()) return;
    for (const layer of layers) {
      const layerBounds = (layer as LeafletLayerWithOptionalPathApi).getBounds?.();
      if (layerBounds?.isValid()) bounds.extend(layerBounds);
    }
    map.fitBounds(bounds, {
      padding: [28, 28],
      maxZoom: 10,
      animate: !reducedMotion,
      duration: 0.55,
    });
  }, [reducedMotion]);

  const selectMapAlert = useCallback((alert: MapAlertSummary) => {
    setSelection({ kind: "alert", alert });
    if (alert.kind === "nws") {
      fitLayer(interactiveLayersRef.current.get(`alert:${alert.id}`)?.layer);
      return;
    }

    const source = handledAlerts.find((candidate) => candidate.id === alert.id);
    if (!source) return;
    const fips = [
      ...(source.sameCodes ?? []).flatMap((same) => fipsFromCoverageRef(sameToCoverageRef(same), stationFipsSet)),
      ...(source.fipsCodes ?? []).flatMap((code) => expandFipsCode(code, stationFipsSet)),
    ];
    const marineZones = (source.sameCodes ?? []).flatMap((same) => {
      const zone = sameToMarineZone(same);
      return zone ? [zone] : [];
    });
    fitLayers(
      [...fips.map((id) => interactiveLayersRef.current.get(`county:${id}`)?.layer),
        ...marineZones.map((id) => interactiveLayersRef.current.get(`marine:${id}`)?.layer)]
        .filter((layer): layer is LeafletLayer => Boolean(layer))
    );
  }, [fitLayer, fitLayers, handledAlerts, stationFipsSet]);

  useEffect(() => {
    const map = mapLibreMapRef.current;
    const syncRadarLayer = () => {
      if (!map || !map.isStyleLoaded()) return;
      if (map.getLayer(RADAR_LAYER_ID)) map.removeLayer(RADAR_LAYER_ID);
      if (map.getSource(RADAR_LAYER_ID)) map.removeSource(RADAR_LAYER_ID);
      if (!radarVisible || !radarProductConfig) return;

      map.addSource(RADAR_LAYER_ID, {
        type: "raster",
        tiles: [radarProductConfig.tileUrlTemplate],
        tileSize: 256,
        // Radar images are time-sensitive; do not retain a stale tile while
        // zooming or switching between the local and mosaic products.
        volatile: true,
      });
      const firstSymbolLayer = map.getStyle().layers?.find((layer) => layer.type === "symbol")?.id;
      map.addLayer({
        id: RADAR_LAYER_ID,
        type: "raster",
        source: RADAR_LAYER_ID,
        paint: {
          "raster-opacity": radarOpacity,
          "raster-fade-duration": 0,
        },
      }, firstSymbolLayer);
    };

    map?.on("style.load", syncRadarLayer);
    if (map?.isStyleLoaded()) syncRadarLayer();
    return () => {
      map?.off("style.load", syncRadarLayer);
    };
  }, [mapReady, radarOpacity, radarProductConfig, radarVisible]);

  useEffect(() => {
    const selectionKey = selection?.kind === "county" || selection?.kind === "marine"
      ? `${selection.kind}:${selection.id}`
      : selection?.kind === "alert"
        ? `alert:${selection.alert.id}`
        : null;

    interactiveLayersRef.current.forEach((entry) => {
      const entryKey = `${entry.kind}:${entry.id}`;
      const selected = selectionKey === entryKey;
      const dimmed = Boolean(selectionKey && !selected);
      const fresh = freshAlertIds.has(entryKey) || (
        entry.kind === "county" && (
          capAlerts.some((alert) => freshAlertIds.has(`nws:${alert.id}`) && fipsFromAlert(alert, stationFipsSet).includes(entry.id)) ||
          handledAlerts.some((alert) => {
            const fips = [
              ...(alert.sameCodes ?? []).flatMap((same) => fipsFromCoverageRef(sameToCoverageRef(same), stationFipsSet)),
              ...(alert.fipsCodes ?? []).flatMap((code) => expandFipsCode(code, stationFipsSet)),
            ];
            return freshAlertIds.has(`station:${alert.id}`) && fips.includes(entry.id);
          })
        )
      ) || (
        entry.kind === "marine" && (
          capAlerts.some((alert) => freshAlertIds.has(`nws:${alert.id}`) && marineZonesFromAlert(alert).includes(entry.id)) ||
          handledAlerts.some((alert) => {
            const zones = (alert.sameCodes ?? []).flatMap((same) => {
              const zone = sameToMarineZone(same);
              return zone ? [zone] : [];
            });
            return freshAlertIds.has(`station:${alert.id}`) && zones.includes(entry.id);
          })
        )
      );

      forEachLeafletPath(entry.layer, (path) => {
        const style = { ...entry.style };
        if (dimmed) {
          style.opacity = 0.3;
          style.fillOpacity = (style.fillOpacity ?? 0) * 0.25;
          style.weight = Math.max(0.75, (style.weight ?? 1) * 0.75);
        } else if (selected) {
          style.opacity = 1;
          style.fillOpacity = Math.min(0.7, (style.fillOpacity ?? 0) + 0.12);
          style.weight = (style.weight ?? 1) + 1.5;
        } else if (hoveredKey === entryKey) {
          style.opacity = 1;
          style.fillOpacity = Math.min(0.65, (style.fillOpacity ?? 0) + 0.08);
          style.weight = (style.weight ?? 1) + 1;
        }
        path.setStyle(style);
        const element = path.getElement();
        element?.classList.toggle("radio-map-freshness", fresh && freshnessCues && !reducedMotion);
        element?.classList.toggle("radio-map-selected", selected);
        element?.classList.toggle("radio-map-hovered", hoveredKey === entryKey);
      });
    });
  }, [capAlerts, freshAlertIds, freshnessCues, handledAlerts, hoveredKey, layersRevision, reducedMotion, selection, stationFipsSet]);

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
      interactiveLayersRef.current.clear();
      setHoveredKey(null);

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

      const registerInteractiveLayer = (
        kind: InteractiveMapLayer["kind"],
        id: string,
        layer: LeafletLayer,
        style: PathOptions,
      ) => {
        interactiveLayersRef.current.set(`${kind}:${id}`, { kind, id, layer, style });
      };

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

      // CAP alerts without geometry → county fill. Marine zones are also
      // interactive when the CAP geometry is present, so retain their severity
      // in the zone-fill index in both cases.
      // Route through deriveAlertSeverity to catch known NWS CAP misclassifications
      // (e.g. Tornado Watch shipped as severity="Extreme").
      for (const alert of capAlerts) {
        const sev = deriveAlertSeverity(alert.properties.event, alert.properties.severity);
        marineZonesFromAlert(alert).forEach((z) => upgradeSeverity(marineDominantSeverity, z, sev));
        if (alert.geometry) continue; // land polygon alerts handled later
        fipsFromAlert(alert, stationFipsSet).forEach((f) => upgradeSeverity(fipsDominantSeverity, f, sev));
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
            const alerts = alertsForCounty(fips);
            const style = capPolygonFips.has(fips)
              ? overlappingCountyStyle(sev)
              : countyFillStyle(sev);
            layer.bindTooltip(
              tooltipContent([
                { text: `${feature.properties.NAME}, ${state}`, strong: true },
                { text: `Severity: ${sev}` },
                { text: `${alerts.length} alert${alerts.length === 1 ? "" : "s"} mapped` },
              ]),
              { sticky: true }
            );
            registerInteractiveLayer("county", fips, layer, toLeafletStyle(style));
            layer.on("mouseover", () => setHoveredKey(`county:${fips}`));
            layer.on("mouseout", () => setHoveredKey((current) => current === `county:${fips}` ? null : current));
            layer.on("click", (event) => {
              L.DomEvent.stopPropagation(event);
              setSelection({
                kind: "county",
                id: fips,
                name: feature.properties.NAME,
                state,
                severity: sev,
                alerts,
              });
              fitLayer(layer);
            });
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
            const alerts = alertsForMarineZone(zoneId);
            const style = capPolygonMarineZones.has(zoneId)
              ? overlappingCountyStyle(sev)
              : countyFillStyle(sev);
            registerInteractiveLayer("marine", zoneId, layer, toLeafletStyle(style));
            layer.on("mouseover", () => setHoveredKey(`marine:${zoneId}`));
            layer.on("mouseout", () => setHoveredKey((current) => current === `marine:${zoneId}` ? null : current));
            layer.on("click", (event) => {
              L.DomEvent.stopPropagation(event);
              setSelection({
                kind: "marine",
                id: zoneId,
                name,
                severity: sev,
                alerts,
              });
              fitLayer(layer);
            });
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
              registerInteractiveLayer("alert", alert.id, layer, style);
              layer.on("mouseover", () => setHoveredKey(`alert:${alert.id}`));
              layer.on("mouseout", () => setHoveredKey((current) => current === `alert:${alert.id}` ? null : current));
              layer.on("click", (event) => {
                L.DomEvent.stopPropagation(event);
                setSelection({ kind: "alert", alert: capSummary(alert) });
                fitLayer(layer);
              });
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

      setLayersRevision((revision) => revision + 1);
    }).catch(() => {
      if (!cancelled) setOverlayError(true);
    });

    return () => { cancelled = true; };
  }, [alertsForCounty, alertsForMarineZone, capAlerts, countiesUrl, fitLayer, handledAlerts, mapReady, marineZonesUrl, resolvedTheme, stationFipsSet, stationMarineZoneSet]);

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

      {radarVisible && radarProductConfig ? (
        <div className="absolute bottom-7 right-3 z-[1000] max-w-[min(18rem,calc(100%-1.5rem))] rounded-md border border-border bg-background/90 px-2.5 py-2 text-xs shadow-sm backdrop-blur-sm">
          <div className="font-medium">{radarProductConfig.legend}</div>
          <div className="text-muted-foreground">{radarProductConfig.sourceLabel} · {Math.round(radarOpacity * 100)}%</div>
        </div>
      ) : null}

      <StationMapSelection
        selection={selection}
        onClose={() => setSelection(null)}
        onSelectAlert={selectMapAlert}
      />

      {/* Severity legend and map options share one stable, right-side panel. */}
      <div
        className="absolute right-3 top-3 z-[1000] rounded-md border border-border bg-background/90 px-2.5 py-2 text-xs shadow-sm backdrop-blur-sm"
        onClick={(event) => event.stopPropagation()}
      >
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
        <div className="mt-1.5 border-t border-border pt-1.5">
          <StationMapControls
            inline
            radarConfig={config.radar}
            radarSource={radarSource}
            radarProduct={effectiveRadarProduct}
            radarVisible={radarVisible}
            radarOpacity={radarOpacity}
            freshnessCues={freshnessCues}
            reducedMotion={reducedMotion}
            onRadarSourceChange={setRadarSource}
            onRadarProductChange={setRadarProduct}
            onRadarVisibleChange={setRadarVisible}
            onRadarOpacityChange={setRadarOpacity}
            onFreshnessCuesChange={setFreshnessCues}
            onReducedMotionChange={setReducedMotion}
          />
        </div>
      </div>
    </div>
  );
}
