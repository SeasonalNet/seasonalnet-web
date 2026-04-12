import { NextRequest, NextResponse } from "next/server";
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

function asArray(x: any): IcecastSource[] {
  if (!x) return [];
  if (Array.isArray(x)) return x.filter(Boolean);
  if (typeof x === "object") return [x];
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

function pairsToObject(raw: any): Record<string, string> {
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

export async function GET(request: NextRequest, context: Ctx) {
  const { stationId } = await context.params;

  const cfg = getStationMetaServerCfg(stationId);
  if (!cfg) {
    return NextResponse.json({ error: "metadata not supported for this station" }, { status: 404 });
  }

  const mountParam = request.nextUrl.searchParams.get("mount") ?? undefined;
  const mountPath = mountParam ? normalizeMount(mountParam) : undefined;

  // --- 1) Prefer Liquidsoap nowplaying (SeasonalWeather "IP-RDS") ---
  // Put this in cfg later if you want; for now, keep it simple + explicit.
  const nowPlayingUrl = cfg.nowPlayingUrl;
  
  if (nowPlayingUrl) {
    try {
      const r = await fetch(nowPlayingUrl, { cache: "no-store" });
      if (r.ok) {
        const raw: any = await r.json();
        const m = pairsToObject(raw);

        const title = String(m.title ?? m.song ?? "").trim();
        const artist = String(m.artist ?? cfg.defaultArtist ?? "").trim() || cfg.defaultArtist;
        const album = String(m.album ?? cfg.defaultAlbum ?? "").trim() || (cfg.defaultAlbum ?? "");
        const artworkUrl = safeArtworkUrl(m.artworkUrl, cfg.defaultArtworkUrl ?? "");

        // Liquidsoap returns [] when it has nothing; only “win” if title exists.
        if (title) {
          return NextResponse.json(
            {
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
            },
            { headers: { "Cache-Control": "no-store, max-age=0" } }
          );
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
    const j: any = await r.json();

    const sources = asArray(j?.icestats?.source);
    const s = pickSource(sources, mountPath);

    const streamTitle = String(s?.title ?? "").trim();

    return NextResponse.json(
      {
        title: streamTitle || cfg.defaultArtist,
        artist: cfg.defaultArtist,
        album: cfg.defaultAlbum ?? "",
        artworkUrl: cfg.defaultArtworkUrl ?? "",
        updatedAt: new Date().toISOString(),
        mount: mountPath ?? null,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch {
    return NextResponse.json(
      {
        title: cfg.defaultArtist,
        artist: cfg.defaultArtist,
        album: cfg.defaultAlbum ?? "",
        artworkUrl: cfg.defaultArtworkUrl ?? "",
        updatedAt: new Date().toISOString(),
        mount: mountPath ?? null,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
