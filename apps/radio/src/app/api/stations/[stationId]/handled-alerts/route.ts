// src/app/api/stations/[stationId]/handled-alerts/route.ts
import { NextResponse } from "next/server"
import { STATION_HANDLED_ALERTS } from "@/lib/station-handled-alert-config"
import { STATION_HANDLED_FEEDS } from "@/lib/server/station-handled-feed-config"

type FeedSender = { name: string; kind?: "relay" | "origin" | "unknown" }

type StationFeedAlert = {
  id: string
  event: string
  headline: string
  severity: string
  urgency: string
  certainty: string
  area: string
  effective: string | null
  ends: string | null
  expires: string | null
  sent: string | null
  sameCodes: string[]
  from: FeedSender | null
  links?: { primary?: string; nws?: string }
}

type StationAlertFeedV1 = {
  stationId?: string
  generatedAt?: string
  source?: string
  alerts?: unknown
}

function clamp(s: unknown, max = 800): string {
  const t = typeof s === "string" ? s : ""
  return t.length > max ? t.slice(0, max) : t
}

function textOrEmpty(v: unknown): string {
  return typeof v === "string" ? v.trim() : ""
}

function toIsoOrNull(v: unknown): string | null {
  if (typeof v !== "string" || v.trim().length === 0) return null
  const ms = Date.parse(v)
  if (!Number.isFinite(ms)) return null
  return new Date(ms).toISOString()
}

function uniqStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const x of v) {
    const s = String(x ?? "").trim()
    if (!s) continue
    if (seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }
  return out
}

function normalizeFrom(v: any): FeedSender | null {
  if (!v) return null

  if (typeof v === "string") {
    const name = v.trim()
    return name ? { name, kind: "unknown" } : null
  }

  if (typeof v === "object") {
    const name = String(v.name ?? v.sender ?? v.from ?? "").trim()
    const kindRaw = String(v.kind ?? v.type ?? "").toLowerCase()
    const kind =
      kindRaw === "relay" ? "relay" :
      kindRaw === "origin" ? "origin" :
      kindRaw === "unknown" ? "unknown" :
      undefined

    return name ? { name, kind } : null
  }

  return null
}

function normalizeAlert(raw: any): StationFeedAlert | null {
  if (!raw || typeof raw !== "object") return null

  const id = clamp(raw.id ?? raw.capId ?? raw.nwsId ?? raw.uri ?? "", 300).trim()
  if (!id) return null

  const sameCodes = uniqStrings(raw.sameCodes ?? raw.same ?? raw.geocode?.SAME)

  const links =
    raw.links && typeof raw.links === "object"
      ? {
          primary: typeof raw.links.primary === "string" ? raw.links.primary : undefined,
          nws: typeof raw.links.nws === "string" ? raw.links.nws : undefined,
        }
      : undefined

  return {
    id,
    event: clamp(raw.event ?? "Alert", 120).trim() || "Alert",
    headline: textOrEmpty(raw.headline),
    severity: clamp(raw.severity ?? "Unknown", 24).trim() || "Unknown",
    urgency: clamp(raw.urgency ?? "Unknown", 24).trim() || "Unknown",
    certainty: clamp(raw.certainty ?? "Unknown", 24).trim() || "Unknown",
    area: textOrEmpty(raw.area ?? raw.areaDesc),
    effective: toIsoOrNull(raw.effective),
    ends: toIsoOrNull(raw.ends),
    expires: toIsoOrNull(raw.expires),
    sent: toIsoOrNull(raw.sent),
    sameCodes,
    from: normalizeFrom(raw.from ?? raw.sender),
    links,
  }
}

async function fetchJsonWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ stationId: string }> }) {
  const { stationId } = await ctx.params

  // Config gate: if not enabled, return a calm "disabled" payload (200).
  const uiCfg = STATION_HANDLED_ALERTS[stationId]
  if (!uiCfg) {
    return NextResponse.json({
      ok: true,
      enabled: false,
      stationId,
      source: "station_feed",
      generatedAt: new Date().toISOString(),
      alerts: [],
    })
  }

  const feedCfg = STATION_HANDLED_FEEDS[stationId]
  if (!feedCfg) {
    return NextResponse.json({
      ok: false,
      enabled: true,
      stationId,
      source: "station_feed",
      generatedAt: new Date().toISOString(),
      error: "station enabled but no server feed config",
      alerts: [],
    })
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "SeasonalNet/2.0 (seasonal@seasonalnet.org)",
  }

  if (feedCfg.bearerTokenEnv) {
    const token = process.env[feedCfg.bearerTokenEnv]
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const revalidate = Math.max(1, Math.floor(feedCfg.revalidateSeconds ?? 10))

  let data: StationAlertFeedV1 | null = null
  try {
    const res = await fetchJsonWithTimeout(
      feedCfg.feedUrl,
      { headers, next: { revalidate } as any },
      8000
    )

    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        enabled: true,
        stationId,
        source: "station_feed",
        generatedAt: new Date().toISOString(),
        error: `feed http ${res.status}`,
        alerts: [],
      })
    }

    data = (await res.json()) as StationAlertFeedV1
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      enabled: true,
      stationId,
      source: "station_feed",
      generatedAt: new Date().toISOString(),
      error: e?.name === "AbortError" ? "feed timeout" : "feed fetch failed",
      alerts: [],
    })
  }

  const rawAlerts = Array.isArray(data?.alerts) ? (data!.alerts as any[]) : []
  const normalized: StationFeedAlert[] = []
  for (const a of rawAlerts) {
    const n = normalizeAlert(a)
    if (n) normalized.push(n)
  }

  // Sort: higher severity-ish first, then soonest ending
  const sevRank: Record<string, number> = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1, Unknown: 0 }
  normalized.sort((a, b) => {
    const s = (sevRank[b.severity] ?? 0) - (sevRank[a.severity] ?? 0)
    if (s !== 0) return s
    const aEnd = Date.parse(a.ends ?? a.expires ?? "") || Number.POSITIVE_INFINITY
    const bEnd = Date.parse(b.ends ?? b.expires ?? "") || Number.POSITIVE_INFINITY
    return aEnd - bEnd
  })

  return NextResponse.json({
    ok: true,
    enabled: true,
    stationId,
    source: data?.source ? clamp(data.source, 80) : "station_feed",
    generatedAt: data?.generatedAt
      ? (toIsoOrNull(data.generatedAt) ?? new Date().toISOString())
      : new Date().toISOString(),
    alerts: normalized,
  })
}
