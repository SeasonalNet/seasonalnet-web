#!/usr/bin/env node
/**
 * scripts/generate-marine-zone-geojson.mjs
 *
 * Run once (or after updating station-alert-config.ts) to regenerate
 * public/marine-zones-filtered.json.
 *
 * Usage:
 *   pnpm run generate:marine-zone-geojson
 *   node scripts/generate-marine-zone-geojson.mjs
 *
 * Requires:
 *   - Node 18+ (built-in fetch)
 *   - system unzip command available
 *   - pnpm package: shapefile
 *
 * Source:
 *   - Official NWS Marine Zones page
 *   - Downloads the latest coastal marine zones zip (mz*.zip) listed there
 *
 * Output:
 *   - public/marine-zones-filtered.json
 */

import { mkdirSync, mkdtempSync, readdirSync, rmSync } from "fs";
import { writeFile } from "fs/promises";
import { tmpdir } from "os";
import { basename, join, resolve } from "path";
import { execFile as execFileCb } from "child_process";
import { promisify } from "util";
import * as shapefile from "shapefile";

const execFile = promisify(execFileCb);

// ---------------------------------------------------------------------------
// Source: all SAME codes from station-alert-config.ts (duplicates fine)
// Keep in sync with the county generator for now.
// ---------------------------------------------------------------------------
const ALL_SAME_CODES = [
  // KEC83
  "011001","024003","024005","024013","024025","024027","024029","024031","024033","024035","024037","024510",
  "051013","051059","051153","051510","042001","042133",

  // KHB36
  "011001","024009","024017","024021","024031","024033","024037","054037",
  "051013","051043","051047","051059","051061","051099","051107","051113","051137","051139","051153","051157",
  "051177","051179","051187","051510","051600","051610","051630","051683","051685",
  "073535","073536","073537","073532","073533","073530","073531",

  // WXM42
  "024001","024013","024021","024043","042001","042009","042055","042057",
  "054003","054023","054027","054031","054037","054057","054065","054071",
  "051015","051043","051061","051069","051091","051107","051139","051165","051171","051187",
  "051660","051790","051820","051840",

  // WXM43
  "024001","024023","024043","042009","042057","042111","054023","054027","054031","054057","054065",
];

// SAME is PSSCCC; marine code family is in SAME[1:3], zone number is SAME[3:6].
const MARINE_SAME_SS_TO_UGC_PREFIX = {
  "73": "ANZ", // Atlantic coastal north
  "74": "AMZ", // Atlantic coastal south
  "71": "GMZ", // Gulf of Mexico
  "75": "PZZ", // Pacific coastal California
  "76": "PZZ", // Pacific coastal Oregon/Washington
  "77": "PKZ", // Alaska coastal
  "78": "PHZ", // Hawaii coastal
  "79": "PMZ", // Pacific Islands
  "70": "LSZ", // Lake Superior
  "81": "LOZ", // Lake Ontario
  "82": "LHZ", // Lake Huron
  "83": "LEZ", // Lake Erie
};

function uniq(arr) {
  return Array.from(new Set(arr));
}

function sameToMarineZone(same) {
  const s = String(same ?? "").trim();
  if (!/^\d{6}$/.test(s)) return null;

  const ss = s.slice(1, 3);
  const prefix = MARINE_SAME_SS_TO_UGC_PREFIX[ss];
  if (!prefix) return null;

  return `${prefix}${s.slice(3)}`.toUpperCase();
}

const TARGET_ZONE_IDS = uniq(
  ALL_SAME_CODES.map(sameToMarineZone).filter(Boolean)
).sort();

const TARGET_ZONE_SET = new Set(TARGET_ZONE_IDS);

console.log(`Targeting ${TARGET_ZONE_IDS.length} unique marine zones.`);
console.log(TARGET_ZONE_IDS.join(", "));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "(seasonalnet.org, info@seasonalnet.org)",
      "Accept": "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

async function fetchBuffer(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "(seasonalnet.org, info@seasonalnet.org)",
      "Accept": "application/zip,application/octet-stream,*/*",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function findLatestCoastalMarineZipUrl() {
  const pageUrl = "https://www.weather.gov/gis/MarineZones";
  const html = await fetchText(pageUrl);

  const matches = [
    ...html.matchAll(/href="([^"]*mz\d{2}[a-z]{2}\d{2}\.zip)"/gi),
  ].map((m) => new URL(m[1], pageUrl).toString());

  const unique = uniq(matches);
  if (!unique.length) {
    throw new Error("Could not find any coastal marine zone zip links on the NWS MarineZones page.");
  }

  // The page lists older files first and newer/current files later.
  return unique.at(-1);
}

function findFirstFile(dir, regex) {
  const entry = readdirSync(dir).find((name) => regex.test(name));
  if (!entry) throw new Error(`Could not find file matching ${regex} in ${dir}`);
  return join(dir, entry);
}

function normalizeFeature(feature) {
  const props = feature?.properties ?? {};
  const id = String(props.ID ?? props.id ?? "").trim().toUpperCase();
  if (!id) return null;

  return {
    type: "Feature",
    properties: {
      ID: id,
      NAME: String(props.NAME ?? props.Name ?? "").trim(),
      WFO: String(props.WFO ?? "").trim(),
      GL_WFO: String(props.GL_WFO ?? "").trim(),
    },
    geometry: feature.geometry ?? null,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const outPath = resolve("public", "marine-zones-filtered.json");
mkdirSync("public", { recursive: true });

const tempDir = mkdtempSync(join(tmpdir(), "radio-spa-marine-"));

try {
  const zipUrl = await findLatestCoastalMarineZipUrl();
  const zipPath = join(tempDir, basename(new URL(zipUrl).pathname));

  console.log(`Fetching ${zipUrl} …`);
  const zipBuf = await fetchBuffer(zipUrl);
  await writeFile(zipPath, zipBuf);

  console.log("Extracting shapefile…");
  try {
    await execFile("unzip", ["-oq", zipPath, "-d", tempDir]);
  } catch (err) {
    throw new Error(
      `Failed to run unzip. Make sure 'unzip' is installed on the host. Original error: ${err}`
    );
  }

  const shpPath = findFirstFile(tempDir, /^mz.*\.shp$/i);
  const dbfPath = findFirstFile(tempDir, /^mz.*\.dbf$/i);

  console.log(`Reading ${basename(shpPath)} …`);
  const source = await shapefile.open(shpPath, dbfPath);

  const features = [];
  while (true) {
    const { done, value } = await source.read();
    if (done) break;

    const feature = normalizeFeature(value);
    if (!feature) continue;
    if (!TARGET_ZONE_SET.has(feature.properties.ID)) continue;

    features.push(feature);
  }

  features.sort((a, b) => a.properties.ID.localeCompare(b.properties.ID));

  const missing = TARGET_ZONE_IDS.filter(
    (id) => !features.some((f) => f.properties.ID === id)
  );

  if (missing.length) {
    console.warn(`Warning: missing ${missing.length} requested marine zones: ${missing.join(", ")}`);
  }

  const geojson = {
    type: "FeatureCollection",
    features,
  };

  const json = JSON.stringify(geojson);
  await writeFile(outPath, json, "utf8");

  console.log(`Matched ${features.length} / ${TARGET_ZONE_IDS.length} marine zones.`);
  console.log(`Written: ${outPath} (${(json.length / 1024).toFixed(1)} KB)`);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
