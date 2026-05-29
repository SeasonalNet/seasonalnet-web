import { NextRequest, NextResponse } from "next/server";
import { problemJson } from "@seasonalnet/shell/src/lib/server/problem";
import { cacheControlHeader, getCachedValue } from "@seasonalnet/shell/src/lib/server/cache";
import { getStationMetaServerCfg } from "@/lib/server/station-metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IcecastSource = {
  listenurl?: string;
  title?: string;
  server_name?: string;
};

type Ctx = {
  params: Promise<{ stationId: string }>;
};

function asArray(x: unknown): IcecastSource[] {
  if (!x) return [];
  if (Array.isArray(x)) return x.filter((item): item is IcecastSource => Boolean(item) && typeof item === "object");
  if (typeof x === "object") return [x as IcecastSource];
  return [];
}

function normalizeMount(mount: string) {
  try {
    if (mount.startsWith("http://") || mount.startsWith("https://")) {
      const u = new URL(mount);
      return u.pathname;
    }
  } catch {}
  const q = mount.indexOf("?");
  return q >= 0 ? mount.slice(0, q) : mount;
}

function pickSource(sources: IcecastSource[], mountPath?: string): IcecastSource | null {
  if (!sources.length) return null;
  if (mountPath) {
    for (const s of sources) {
      const lu = String(s.listenurl ?? "");
      if (lu.endsWith(mountPath)) return s;
    }
  }
  return sources[0];
}

function pairsToObject(raw: unknown): Record<string, string> {
  // Liquidsoap /nowplaying returns either:
  //   []  (no metadata)
  // or:
  //   [["title","..."],["artist","..."],...]
  if (Array.isArray(raw)) {
    try {
      const pairs = raw
        .filter((p) => Array.isArray(p) && p.length === 2)
        .map((p) => [String(p[0]), String(p[1])] as const);
      return Object.fromEntries(pairs);
    } catch {
      return {};
    }
  }
  if (raw && typeof raw === "object") {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) out[String(k)] = String(v);
    return out;
  }
  return {};
}

function safeArtworkUrl(u: string | undefined, fallback: string): string {
  const s = String(u ?? "").trim();
  if (!s) return fallback;
  // allow absolute http(s) or site-local /path
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("/")) return s;
  return fallback;
}

async function buildStationMetadata(stationId: string, mountPath?: string) {
  const cfg = getStationMetaServerCfg(stationId);
  if (!cfg) return null;

  // --- 1) Prefer Liquidsoap nowplaying (SeasonalWeather "IP-RDS") ---
  // Put this in cfg later if you want; for now, keep it simple + explicit.
  const nowPlayingUrl = cfg.nowPlayingUrl;

  if (nowPlayingUrl) {
    try {
      const r = await fetch(nowPlayingUrl, { cache: "no-store" });
      if (r.ok) {
        const raw: unknown = await r.json();
        const m = pairsToObject(raw);

        const title = String(m.title ?? m.song ?? "").trim();
        const artist = String(m.artist ?? cfg.defaultArtist ?? "").trim() || cfg.defaultArtist;
        const album = String(m.album ?? cfg.defaultAlbum ?? "").trim() || (cfg.defaultAlbum ?? "");
        const artworkUrl = safeArtworkUrl(m.artworkUrl, cfg.defaultArtworkUrl ?? "");

        // Liquidsoap returns [] when it has nothing; only “win” if title exists.
        if (title) {
          return {
            title,
            artist,
            album,
            artworkUrl,
            updatedAt: new Date().toISOString(),
            mount: mountPath ?? null,

            // optional extra fields (won’t hurt anything)
            sw_kind: m.sw_kind ?? null,
            sw_cycle_key: m.sw_cycle_key ?? null,
            sw_mode: m.sw_mode ?? null,
          };
        }
      }
    } catch {
      // ignore, fall back to Icecast
    }
  }

  // --- 2) Fallback: Icecast status-json.xsl ---
  try {
    const r = await fetch(cfg.statusUrl, { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j: unknown = await r.json();
    const icestats = j && typeof j === "object" ? (j as { icestats?: { source?: unknown } }).icestats : undefined;

    const sources = asArray(icestats?.source);
    const s = pickSource(sources, mountPath);

    const streamTitle = String(s?.title ?? "").trim();

    return {
      title: streamTitle || cfg.defaultArtist,
      artist: cfg.defaultArtist,
      album: cfg.defaultAlbum ?? "",
      artworkUrl: cfg.defaultArtworkUrl ?? "",
      updatedAt: new Date().toISOString(),
      mount: mountPath ?? null,
    };
  } catch {
    return {
      title: cfg.defaultArtist,
      artist: cfg.defaultArtist,
      album: cfg.defaultAlbum ?? "",
      artworkUrl: cfg.defaultArtworkUrl ?? "",
      updatedAt: new Date().toISOString(),
      mount: mountPath ?? null,
    };
  }
}

export async function GET(request: NextRequest, context: Ctx) {
  const { stationId } = await context.params;

  const mountParam = request.nextUrl.searchParams.get("mount") ?? undefined;
  const mountPath = mountParam ? normalizeMount(mountParam) : undefined;

  if (!getStationMetaServerCfg(stationId)) {
    return problemJson({
      type: "/problems/unsupported-station-metadata",
      title: "Station metadata is not supported",
      status: 404,
      detail: "metadata not supported for this station",
    });
  }

  const cached = await getCachedValue(
    {
      key: `radio:station-metadata:${stationId}:${mountPath ?? "default"}`,
      ttlMs: 5_000,
      staleTtlMs: 30_000,
    },
    async () => {
      const payload = await buildStationMetadata(stationId, mountPath);
      if (!payload) throw new Error("metadata not supported for this station");
      return payload;
    },
  );

  return NextResponse.json(cached.value, {
    headers: {
      "Cache-Control": cacheControlHeader(5, 30),
      "X-SeasonalNet-Cache": cached.status,
    },
  });
}
