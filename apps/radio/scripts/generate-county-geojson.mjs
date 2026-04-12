#!/usr/bin/env node
/**
 * scripts/generate-county-geojson.mjs
 *
 * Run once (or after updating station-alert-config.ts) to regenerate
 * public/counties-filtered.json.
 *
 * Usage:
 *   node scripts/generate-county-geojson.mjs
 *
 * Requires: network access (fetches Census TIGER TopoJSON via cdn.jsdelivr.net)
 * Output:   public/counties-filtered.json  (~150-250 KB)
 */

import { createWriteStream, mkdirSync } from "fs";
import { writeFile } from "fs/promises";
import { resolve } from "path";

// ---------------------------------------------------------------------------
// Source: all SAME codes from station-alert-config.ts (duplicates fine)
// ---------------------------------------------------------------------------
const ALL_SAME_CODES = [
  // KEC83
  "011001","024003","024005","024013","024025","024027","024029","024031","024033","024035","024037","024510",
  "051013","051059","051153","051510","042001","042133",
  // KHB36
  "011001","024009","024017","024021","024031","024033","024037","054037",
  "051013","051043","051047","051059","051061","051099","051107","051113","051137","051139","051153","051157",
  "051177","051179","051187","051510","051600","051610","051630","051683","051685",
  "073535","073536","073537","073532","073533",
  // WXM42
  "024001","024013","024021","024043","042001","042009","042055","042057",
  "054003","054023","054027","054031","054037","054057","054065","054071",
  "051015","051043","051061","051069","051091","051107","051139","051165","051171","051187",
  "051660","051790","051820","051840",
  // WXM43
  "024001","024023","024043","042009","042057","042111","054023","054027","054031","054057","054065",
];

// SAME = "0" + 5-digit-FIPS.  Marine zones start with "07" — skip them.
const COUNTY_FIPS_SET = new Set(
  ALL_SAME_CODES
    .filter(c => !c.startsWith("07"))
    .map(c => c.slice(1)) // "024031" → "24031"
);

console.log(`Targeting ${COUNTY_FIPS_SET.size} unique county FIPS codes.`);

// ---------------------------------------------------------------------------
// Fetch TopoJSON from CDN, convert relevant features to GeoJSON
// ---------------------------------------------------------------------------
const TOPO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}

// Minimal TopoJSON → GeoJSON arc decoder (no external deps)
function decode(topology, objectName) {
  const arcs = topology.arcs;
  const scale = topology.transform?.scale ?? [1, 1];
  const translate = topology.transform?.translate ?? [0, 0];

  function decodeArc(arcIndex) {
    const reversed = arcIndex < 0;
    const arc = arcs[reversed ? ~arcIndex : arcIndex];
    let x = 0, y = 0;
    const coords = arc.map(([dx, dy]) => {
      x += dx; y += dy;
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
    });
    return reversed ? coords.reverse() : coords;
  }

  function buildRing(arcRefs) {
    const ring = [];
    for (const ref of arcRefs) {
      const pts = decodeArc(ref);
      // avoid duplicating junction point
      if (ring.length) pts.shift();
      ring.push(...pts);
    }
    return ring;
  }

  const obj = topology.objects[objectName];
  const features = [];

  for (const geom of obj.geometries) {
    const fips = String(geom.id).padStart(5, "0");
    if (!COUNTY_FIPS_SET.has(fips)) continue;

    let geometry;
    if (geom.type === "Polygon") {
      geometry = { type: "Polygon", coordinates: geom.arcs.map(buildRing) };
    } else if (geom.type === "MultiPolygon") {
      geometry = {
        type: "MultiPolygon",
        coordinates: geom.arcs.map(poly => poly.map(buildRing)),
      };
    } else {
      continue;
    }

    features.push({
      type: "Feature",
      properties: { GEOID: fips, NAME: geom.properties?.name ?? "" },
      geometry,
    });
  }

  return { type: "FeatureCollection", features };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const outPath = resolve("public", "counties-filtered.json");
mkdirSync("public", { recursive: true });

console.log(`Fetching ${TOPO_URL} …`);
const topo = await fetchJson(TOPO_URL);
console.log("Decoding counties…");
const geojson = decode(topo, "counties");
console.log(`Matched ${geojson.features.length} / ${COUNTY_FIPS_SET.size} counties.`);

const json = JSON.stringify(geojson);
await writeFile(outPath, json, "utf8");
console.log(`Written: ${outPath}  (${(json.length / 1024).toFixed(1)} KB)`);
