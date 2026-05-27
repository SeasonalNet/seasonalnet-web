// src/app/api/stations/[stationId]/handled-alerts/route.ts
import { NextResponse } from "next/server"
import { cacheControlHeader, getCachedValue } from "@seasonalnet/shell/src/lib/server/cache"
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
  source: string | null
  from: FeedSender | null
  links?: { primary?: string; nws?: string }
}

type StationAlertFeedV1 = {
  stationId?: string
  generatedAt?: string
  source?: string
  alerts?: unknown
}

type UnknownRecord = Record<string, unknown>

function asRecord(v: unknown): UnknownRecord | null {
  return v && typeof v === "object" ? (v as UnknownRecord) : null
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

function normalizeFrom(v: unknown): FeedSender | null {
  if (!v) return null

  if (typeof v === "string") {
    const name = v.trim()
    return name ? { name, kind: "unknown" } : null
  }

  const record = asRecord(v)
  if (record) {
    const name = String(record.name ?? record.sender ?? record.from ?? "").trim()
    const kindRaw = String(record.kind ?? record.type ?? "").toLowerCase()
    const kind =
      kindRaw === "relay" ? "relay" :
      kindRaw === "origin" ? "origin" :
      kindRaw === "unknown" ? "unknown" :
      undefined

    return name ? { name, kind } : null
  }

  return null
}

function normalizeAlert(raw: unknown): StationFeedAlert | null {
  const record = asRecord(raw)
  if (!record) return null

  const id = clamp(record.id ?? record.capId ?? record.nwsId ?? record.uri ?? "", 300).trim()
  if (!id) return null

  const geocode = asRecord(record.geocode)
  const sameCodes = uniqStrings(record.sameCodes ?? record.same ?? geocode?.SAME)
  const rawLinks = asRecord(record.links)

  const links = rawLinks
    ? {
        primary: typeof rawLinks.primary === "string" ? rawLinks.primary : undefined,
        nws: typeof rawLinks.nws === "string" ? rawLinks.nws : undefined,
      }
    : undefined

  return {
    id,
    event: clamp(record.event ?? "Alert", 120).trim() || "Alert",
    headline: textOrEmpty(record.headline),
    severity: clamp(record.severity ?? "Unknown", 24).trim() || "Unknown",
    urgency: clamp(record.urgency ?? "Unknown", 24).trim() || "Unknown",
    certainty: clamp(record.certainty ?? "Unknown", 24).trim() || "Unknown",
    area: textOrEmpty(record.area ?? record.areaDesc),
    effective: toIsoOrNull(record.effective),
    ends: toIsoOrNull(record.ends),
    expires: toIsoOrNull(record.expires),
    sent: toIsoOrNull(record.sent),
    sameCodes,
    source: textOrEmpty(record.source ?? record.provider ?? record.channel) || null,
    from: normalizeFrom(record.from ?? record.sender),
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

async function buildHandledAlerts(stationId: string) {
  const uiCfg = STATION_HANDLED_ALERTS[stationId]
  if (!uiCfg) {
    return {
      ok: true,
      enabled: false,
      stationId,
      source: "station_feed",
      generatedAt: new Date().toISOString(),
      alerts: [],
    }
  }

  const feedCfg = STATION_HANDLED_FEEDS[stationId]
  if (!feedCfg) {
    return {
      ok: false,
      enabled: true,
      stationId,
      source: "station_feed",
      generatedAt: new Date().toISOString(),
      error: "station enabled but no server feed config",
      alerts: [],
    }
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
      { headers, next: { revalidate } } as RequestInit & { next: { revalidate: number } },
      8000
    )

    if (!res.ok) {
      return {
        ok: false,
        enabled: true,
        stationId,
        source: "station_feed",
        generatedAt: new Date().toISOString(),
        error: `feed http ${res.status}`,
        alerts: [],
      }
    }

    data = (await res.json()) as StationAlertFeedV1
  } catch (e: unknown) {
    return {
      ok: false,
      enabled: true,
      stationId,
      source: "station_feed",
      generatedAt: new Date().toISOString(),
      error: e instanceof Error && e.name === "AbortError" ? "feed timeout" : "feed fetch failed",
      alerts: [],
    }
  }

  const rawAlerts = Array.isArray(data?.alerts) ? (data.alerts as unknown[]) : []
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

  return {
    ok: true,
    enabled: true,
    stationId,
    source: data?.source ? clamp(data.source, 80) : "station_feed",
    generatedAt: data?.generatedAt
      ? (toIsoOrNull(data.generatedAt) ?? new Date().toISOString())
      : new Date().toISOString(),
    alerts: normalized,
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ stationId: string }> }) {
  const { stationId } = await ctx.params

  const feedCfg = STATION_HANDLED_FEEDS[stationId]
  const ttlSeconds = Math.max(1, Math.floor(feedCfg?.revalidateSeconds ?? 10))

  const cached = await getCachedValue(
    {
      key: `radio:handled-alerts:${stationId}`,
      ttlMs: ttlSeconds * 1000,
      staleTtlMs: Math.max(30_000, ttlSeconds * 5_000),
    },
    () => buildHandledAlerts(stationId),
  )

  return NextResponse.json(cached.value, {
    headers: {
      "Cache-Control": cacheControlHeader(ttlSeconds, Math.max(30, ttlSeconds * 5)),
      "X-SeasonalNet-Cache": cached.status,
    },
  })
}
