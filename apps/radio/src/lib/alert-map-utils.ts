// src/lib/alert-map-utils.ts
//
// Utilities shared between the map component and any server-side logic.

import type { PathOptions } from "leaflet";

// ---------------------------------------------------------------------------
// Types (mirroring NWS CAP API shapes we care about)
// ---------------------------------------------------------------------------

export type NwsSeverity = "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";
export type NwsUrgency  = "Immediate" | "Expected" | "Future" | "Past" | "Unknown";

export interface NwsAlertFeature {
  id: string;
  type: "Feature";
  geometry: GeoJSON.Geometry | null;
  properties: {
    id: string;
    event: string;
    severity: NwsSeverity;
    urgency: NwsUrgency;
    certainty: string;
    headline: string | null;
    description: string | null;
    areaDesc: string;
    effective: string;
    expires: string;
    senderName: string;
    status: string;
    messageType: string;
    parameters?: {
      SAME?: string[];
      [key: string]: unknown;
    };
  };
}

export interface StationHandledAlert {
  id: string;
  eventType: string;          // e.g. "Required Weekly Test"
  severity?: string;
  source?: string;            // e.g. "WJON/TV"
  areaDesc?: string;          // free-text area description
  sameCodes?: string[];       // 6-digit SAME codes if available
  fipsCodes?: string[];       // 5-digit FIPS if resolved
  effective?: string;
  expires?: string;
  raw?: string;
}

// ---------------------------------------------------------------------------
// Severity → visual style
// ---------------------------------------------------------------------------

export type AlertRenderStyle = {
  fillColor: string;
  fillOpacity: number;
  color: string;        // stroke
  weight: number;
  dashArray?: string;
};

/**
 * For NWS CAP alerts that have a polygon (exact geometry from CAP).
 * Thick border, semi-transparent fill.
 */
export function capPolygonStyle(severity: NwsSeverity): AlertRenderStyle {
  return {
    ..._severityFill(severity, 0.18),
    weight: 3,
  };
}

/**
 * For county fills (station-handled alerts, NWWS-OI, no-geometry).
 * Solid fill, lighter weight border.
 */
export function countyFillStyle(severity: NwsSeverity | string): AlertRenderStyle {
  return {
    ..._severityFill(severity as NwsSeverity, 0.35),
    weight: 1.5,
  };
}

/**
 * For counties that are affected by BOTH a CAP polygon alert AND a
 * station-handled alert — rendered with a hatch/cross-hatch pattern.
 * Leaflet-pattern is optional; we fall back to a dashed stroke.
 */
export function overlappingCountyStyle(severity: NwsSeverity | string): AlertRenderStyle {
  return {
    ..._severityFill(severity as NwsSeverity, 0.0),  // transparent fill — pattern handles it
    weight: 2.5,
    dashArray: "6 4",
  };
}

function _severityFill(severity: NwsSeverity, fillOpacity: number): Omit<AlertRenderStyle, "weight"> {
  const { fill, stroke } = SEVERITY_COLORS[severity] ?? SEVERITY_COLORS["Unknown"];
  return { fillColor: fill, fillOpacity, color: stroke };
}

export const SEVERITY_COLORS: Record<NwsSeverity | "Unknown", { fill: string; stroke: string }> = {
  Extreme:  { fill: "#ff1744", stroke: "#b71c1c" },
  Severe:   { fill: "#ff6d00", stroke: "#e65100" },
  Moderate: { fill: "#ffd600", stroke: "#f9a825" },
  Minor:    { fill: "#00e5ff", stroke: "#006064" },
  Unknown:  { fill: "#b0bec5", stroke: "#546e7a" },
};

// ---------------------------------------------------------------------------
// NWWS-OI / ERN severity derivation
// ---------------------------------------------------------------------------
// Maps known EAS/SAME event-name strings → CAP severity tier.
// Used as a fallback when severity === "Unknown" (NWWS-OI and ERN/GWES sources,
// which carry no CAP severity field).
//
// Assignments align with how the NWS classifies these events when they issue
// corresponding CAP messages. Tests and operational messages stay Unknown.
//
// Keys are the canonical strings produced by _sf_eas_event_label_full() in
// SeasonalWeather's main.py — do not change capitalisation or punctuation
// without a matching backend update.
const NWWS_EVENT_SEVERITY: Record<string, NwsSeverity> = {
  // -- Extreme: imminent, life-threatening --------------------------------
  "Tornado Warning":              "Extreme",
  "Extreme Wind Warning":         "Extreme",
  "Tsunami Warning":              "Extreme",
  "Nuclear Power Plant Warning":  "Extreme",
  "Radiological Hazard Warning":  "Extreme",
  "Hazardous Materials Warning":  "Extreme",
  "Civil Danger Warning":         "Extreme",
  "Evacuation Immediate":         "Extreme",
  "Emergency Action Notification":"Extreme",
  "Child Abduction Emergency":    "Extreme",
  "Volcano Warning":              "Extreme",
  "Earthquake Warning":           "Extreme",

  // -- Severe: significant threat -----------------------------------------
  "Severe Thunderstorm Warning":  "Severe",
  "Flash Flood Warning":          "Severe",
  "Flood Warning":                "Severe",
  "Hurricane Warning":            "Severe",
  "Tropical Storm Warning":       "Severe",
  "Storm Surge Warning":          "Severe",
  "Blizzard Warning":             "Severe",
  "Winter Storm Warning":         "Severe",
  "High Wind Warning":            "Severe",
  "Dust Storm Warning":           "Severe",
  "Fire Warning":                 "Severe",
  "Avalanche Warning":            "Severe",
  "Coastal Flood Warning":        "Severe",
  "Law Enforcement Warning":      "Severe",
  "Shelter in Place Warning":     "Severe",
  "Special Marine Warning":       "Severe",
  "Blue Alert":                   "Severe",
  "911 Telephone Outage Emergency": "Severe",
  "Local Area Emergency":         "Severe",
  "Missing and Endangered Persons": "Severe",

  // -- Moderate: watches / potential threat --------------------------------
  "Tornado Watch":                "Moderate",
  "Severe Thunderstorm Watch":    "Moderate",
  "Flash Flood Watch":            "Moderate",
  "Flood Watch":                  "Moderate",
  "Hurricane Watch":              "Moderate",
  "Tropical Storm Watch":         "Moderate",
  "Storm Surge Watch":            "Moderate",
  "Winter Storm Watch":           "Moderate",
  "High Wind Watch":              "Moderate",
  "Avalanche Watch":              "Moderate",
  "Coastal Flood Watch":          "Moderate",
  "Tsunami Watch":                "Moderate",
  "Civil Emergency Message":      "Moderate",
  "National Information Center":  "Moderate",

  // -- Minor: statements, advisories, informational -----------------------
  "Special Weather Statement":    "Minor",
  "Flash Flood Statement":        "Minor",
  "Flood Statement":              "Minor",
  "Severe Weather Statement":     "Minor",
  "Hurricane Statement":          "Minor",
  "Administrative Message":       "Minor",
  "Network Message Notification": "Minor",

  // -- Unknown: tests / operational (grey is correct here) ----------------
  "Required Weekly Test":         "Unknown",
  "Required Monthly Test":        "Unknown",
  "National Periodic Test":       "Unknown",
  "Practice/Demo Warning":        "Unknown",
  // Legacy aliases (added by _SF_EAS_EVENT_LABELS_FULL.setdefault in main.py)
  "Emergency Action Termination": "Unknown",
  "National Audible Test":        "Unknown",
  "National Silent Test":         "Unknown",
};

// ---------------------------------------------------------------------------
// Known NWS CAP severity misclassifications
// ---------------------------------------------------------------------------
// NWS issues some CAP messages with severity values that don't match the
// operational meaning of the event. Override those here before trusting the
// raw CAP field.  Add entries if new discrepancies are found in the wild.
//
// Confirmed:
//   TO.A (Tornado Watch) → NWS CAP sends severity="Extreme", same as TO.W.
//   The watch tier is "Moderate" by any reasonable definition.
const KNOWN_CAP_SEVERITY_OVERRIDES: Record<string, NwsSeverity> = {
  "Tornado Watch": "Moderate",
};

/**
 * Derive the best available NwsSeverity for an alert.
 *
 * Works for both CAP-sourced (NWS API) and NWWS-OI / ERN/GWES alerts.
 *
 * Derivation order:
 *   1. KNOWN_CAP_SEVERITY_OVERRIDES: correct confirmed NWS CAP misclassifications
 *      regardless of what the severity field says.
 *   2. Non-Unknown CAP severity: trust it for all other CAP-sourced alerts.
 *   3. NWWS_EVENT_SEVERITY table lookup: for Unknown-severity (NWWS-OI/ERN) alerts.
 *   4. Suffix heuristic: "Warning"/"Emergency" → Severe, "Watch" → Moderate,
 *      "Advisory"/"Statement" → Minor.
 *   5. Unknown (grey) — correct for tests and anything genuinely unclassifiable.
 */
export function deriveAlertSeverity(
  eventName: string | undefined,
  severity: string | undefined,
): NwsSeverity {
  const name = (eventName ?? "").trim();

  // Step 1: Override known NWS CAP misclassifications by event name.
  if (name in KNOWN_CAP_SEVERITY_OVERRIDES) return KNOWN_CAP_SEVERITY_OVERRIDES[name];

  const sev = (severity ?? "Unknown").trim() as NwsSeverity;

  // Step 2: If a real CAP severity was provided, trust it.
  if (sev !== "Unknown" && sev in SEVERITY_COLORS) return sev;

  // Step 3: Exact table lookup (covers all 57 canonical SeasonalWeather event strings).
  if (name in NWWS_EVENT_SEVERITY) return NWWS_EVENT_SEVERITY[name];

  // Step 4: Suffix heuristic — safety net for any future event codes not yet in the table.
  const lower = name.toLowerCase();
  if (lower.endsWith("warning") || lower.endsWith("emergency")) return "Severe";
  if (lower.endsWith("watch"))                                   return "Moderate";
  if (lower.endsWith("advisory") || lower.endsWith("statement")) return "Minor";

  return "Unknown";
}

// ---------------------------------------------------------------------------
// SAME code ↔ land / marine coverage helpers
// ---------------------------------------------------------------------------

export type CoverageRef =
  | { kind: "fips"; id: string }
  | { kind: "state"; id: string }
  | { kind: "marineZone"; id: string };

// SAME PSSCCC → marine UGC prefix by SS
const MARINE_SAME_SS_TO_UGC_PREFIX: Record<string, string> = {
  "70": "LSZ", // Lake Superior
  "71": "GMZ", // Gulf of Mexico
  "73": "ANZ", // Atlantic north / mid-Atlantic / New England
  "74": "AMZ", // Atlantic south
  "75": "PZZ", // Pacific coastal
  "76": "PZZ", // Pacific coastal
  "77": "PKZ", // Alaska coastal
  "78": "PHZ", // Hawaii coastal
  "79": "PMZ", // Pacific Islands
  "81": "LOZ", // Lake Ontario
  "82": "LHZ", // Lake Huron
  "83": "LEZ", // Lake Erie
};

export const NATIONAL_SAME_LOCATION = "000000";

function normalizeSameCode(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return /^\d{6}$/.test(s) ? s : null;
}

function normalizeFipsCode(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return /^\d{5}$/.test(s) ? s : null;
}

function uniqOrdered(values: Iterable<string>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function fipsInState(stateFips: string, availableFips: Iterable<string> | undefined): string[] {
  if (!/^\d{2}$/.test(stateFips) || !availableFips) return [];

  const matches: string[] = [];
  for (const raw of availableFips) {
    const fips = normalizeFipsCode(raw);
    if (!fips || fips === "00000") continue;
    if (fips.startsWith(stateFips)) matches.push(fips);
  }
  return uniqOrdered(matches);
}

/**
 * True for an ordinary state/territory-wide SAME location: 0SS000.
 *
 * 000000 is national/all-US and is intentionally not treated as a local
 * wildcard.  Marine SS families are also not treated as state wildcards.
 */
export function isStatewideSameCode(same: string): boolean {
  const s = normalizeSameCode(same);
  if (!s || s === NATIONAL_SAME_LOCATION) return false;
  if (!s.startsWith("0") || !s.endsWith("000")) return false;
  return !MARINE_SAME_SS_TO_UGC_PREFIX[s.slice(1, 3)];
}

export function sameToStateFips(same: string): string | null {
  const s = normalizeSameCode(same);
  return s && isStatewideSameCode(s) ? s.slice(1, 3) : null;
}

/**
 * SAME codes are 6 digits:
 *   - land county/city: "0" + 5-digit county/independent-city FIPS
 *   - state-wide land:  0SS000, expanded against the station service area
 *   - marine:          PSSCCC where SS selects the marine UGC prefix
 */
export function sameToCoverageRef(same: string): CoverageRef | null {
  const s = normalizeSameCode(same);
  if (!s || s === NATIONAL_SAME_LOCATION) return null;

  const marinePrefix = MARINE_SAME_SS_TO_UGC_PREFIX[s.slice(1, 3)];
  if (marinePrefix) {
    return { kind: "marineZone", id: `${marinePrefix}${s.slice(3)}` };
  }

  if (!s.startsWith("0")) return null;
  if (isStatewideSameCode(s)) return { kind: "state", id: s.slice(1, 3) };
  return { kind: "fips", id: s.slice(1) };
}

export function sameToFips(same: string): string | null {
  const ref = sameToCoverageRef(same);
  return ref?.kind === "fips" ? ref.id : null;
}

export function sameToMarineZone(same: string): string | null {
  const ref = sameToCoverageRef(same);
  return ref?.kind === "marineZone" ? ref.id : null;
}

export function fipsToSame(fips: string): string {
  return "0" + fips.padStart(5, "0");
}

/**
 * Expand a SAME coverage ref into concrete station-area county/city FIPS codes.
 *
 * State-wide SAME codes intentionally expand only across the provided station
 * service-area FIPS set, not every county in the state.
 */
export function fipsFromCoverageRef(
  ref: CoverageRef | null,
  availableFips?: Iterable<string>,
): string[] {
  if (!ref) return [];
  if (ref.kind === "fips") return [ref.id];
  if (ref.kind === "state") return fipsInState(ref.id, availableFips);
  return [];
}

/**
 * Expand a raw 5-digit FIPS value, treating SS000 as a state wildcard when a
 * station service-area FIPS set is available.
 */
export function expandFipsCode(
  fips: string,
  availableFips?: Iterable<string>,
): string[] {
  const normalized = normalizeFipsCode(fips);
  if (!normalized || normalized === "00000") return [];
  if (normalized.endsWith("000")) {
    const expanded = fipsInState(normalized.slice(0, 2), availableFips);
    return expanded.length > 0 ? expanded : [];
  }
  return [normalized];
}

export function fipsFromSameCode(
  same: string,
  availableFips?: Iterable<string>,
): string[] {
  return fipsFromCoverageRef(sameToCoverageRef(same), availableFips);
}

/**
 * Return true when a SAME location intersects a configured station service area.
 *
 * Exact SAME matches always pass, while 0SS000 state-wide inputs pass only when
 * the service area contains at least one concrete county/city SAME code in that
 * state.  000000 never matches.
 */
export function sameCodeIntersectsServiceArea(
  same: string,
  serviceAreaSameCodes: Iterable<string>,
): boolean {
  const s = normalizeSameCode(same);
  if (!s || s === NATIONAL_SAME_LOCATION) return false;

  const serviceCodes = Array.from(serviceAreaSameCodes, (code) => normalizeSameCode(code))
    .filter((code): code is string => Boolean(code));

  if (serviceCodes.includes(s)) return true;

  const stateFips = sameToStateFips(s);
  if (!stateFips) return false;

  return serviceCodes.some((code) => {
    const ref = sameToCoverageRef(code);
    return ref?.kind === "fips" && ref.id.startsWith(stateFips);
  });
}

export function sameCodesIntersectServiceArea(
  sameCodes: Iterable<string> | undefined,
  serviceAreaSameCodes: Iterable<string>,
): boolean {
  for (const same of sameCodes ?? []) {
    if (sameCodeIntersectsServiceArea(same, serviceAreaSameCodes)) return true;
  }
  return false;
}

/**
 * Extract county FIPS codes referenced in a NWS alert.
 */
export function fipsFromAlert(
  alert: NwsAlertFeature,
  availableFips?: Iterable<string>,
): string[] {
  const same: string[] = alert.properties.parameters?.SAME ?? [];
  return uniqOrdered(same.flatMap((s) => fipsFromSameCode(s, availableFips)));
}

/**
 * Extract marine UGC zone IDs referenced in a NWS alert.
 * Example: "073535" → "ANZ535"
 */
export function marineZonesFromAlert(alert: NwsAlertFeature): string[] {
  const same: string[] = alert.properties.parameters?.SAME ?? [];
  return same.flatMap((s) => {
    const z = sameToMarineZone(s);
    return z ? [z] : [];
  });
}

// ---------------------------------------------------------------------------
// Leaflet PathOptions helper (converts our style to Leaflet shape)
// ---------------------------------------------------------------------------
export function toLeafletStyle(s: AlertRenderStyle): PathOptions {
  return {
    fillColor:    s.fillColor,
    fillOpacity:  s.fillOpacity,
    color:        s.color,
    weight:       s.weight,
    dashArray:    s.dashArray,
    opacity:      0.9,
  };
}
