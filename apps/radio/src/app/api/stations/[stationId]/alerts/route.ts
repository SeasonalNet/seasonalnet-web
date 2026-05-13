// src/app/api/stations/[stationId]/alerts/route.ts
import { NextResponse } from "next/server"
import { cacheControlHeader, getCachedValue } from "@seasonalnet/shell/src/lib/server/cache"
import { STATION_ALERTS } from "@/lib/station-alert-config"
import { sameCodesIntersectServiceArea, sameToMarineZone } from "@/lib/alert-map-utils"

type NwsFeature = {
  id?: string
  geometry?: GeoJSON.Geometry | null
  properties?: {
    event?: string
    headline?: string
    severity?: string
    urgency?: string
    certainty?: string
    areaDesc?: string
    effective?: string
    ends?: string | null
    expires?: string
    sent?: string
    geocode?: {
      SAME?: string[]
      UGC?: string[]
    }
  }
}

function isNwsKeepAliveOrTest(f: NwsFeature): boolean {
  const id = String(f?.id ?? "").toLowerCase()
  const p = f?.properties ?? {}
  const event = String(p.event ?? "").toLowerCase()
  const headline = String(p.headline ?? "").trim()

  if (id.includes("keepalive")) return true
  if (event === "test message" && headline.length === 0) return true

  return false
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}

async function fetchNwsActiveAlertsByArea(area: string, ua: string): Promise<NwsFeature[]> {
  const url = `https://api.weather.gov/alerts/active?area=${encodeURIComponent(area)}`
  const res = await fetch(url, {
    headers: {
      "User-Agent": ua,
      "Accept": "application/geo+json",
    },
    next: { revalidate: 60 },
  })

  if (!res.ok) return []

  const data = await res.json()
  return Array.isArray(data?.features) ? (data.features as NwsFeature[]) : []
}

async function fetchNwsActiveAlertsByZone(zone: string, ua: string): Promise<NwsFeature[]> {
  const url = `https://api.weather.gov/alerts/active?zone=${encodeURIComponent(zone)}`
  const res = await fetch(url, {
    headers: {
      "User-Agent": ua,
      "Accept": "application/geo+json",
    },
    next: { revalidate: 60 },
  })

  if (!res.ok) return []

  const data = await res.json()
  return Array.isArray(data?.features) ? (data.features as NwsFeature[]) : []
}

async function buildStationAlerts(stationId: string) {
  const cfg = STATION_ALERTS[stationId]
  if (!cfg) return null

  const ua = "(seasonalnet.org, info@seasonalnet.org)"

  const serviceAreaSameCodes = uniq(cfg.sameCodes).map(String)
  const areas = uniq(cfg.nwsAreas)
  const marineZones = uniq(
    cfg.sameCodes
      .map((code) => sameToMarineZone(String(code)))
      .filter((v): v is string => Boolean(v))
  )

  const featureLists = await Promise.all([
    ...areas.map((a) => fetchNwsActiveAlertsByArea(a, ua)),
    ...marineZones.map((z) => fetchNwsActiveAlertsByZone(z, ua)),
  ])

  // Merge + de-dupe by feature.id
  const merged: NwsFeature[] = []
  const seen = new Set<string>()
  for (const list of featureLists) {
    for (const f of list) {
      const key = String(f?.id ?? "")
      if (!key) continue
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(f)
    }
  }

  // Filter out keepalives/tests, then filter to service-area SAME intersection
  const filtered = merged
    .filter((f) => !isNwsKeepAliveOrTest(f))
    .filter((f) => {
      const sames = f?.properties?.geocode?.SAME
      if (!Array.isArray(sames) || sames.length === 0) return false
      return sameCodesIntersectServiceArea(sames.map(String), serviceAreaSameCodes)
    })

  const alerts = filtered.map((f) => {
    const p = f.properties ?? {}
    const ends = p.ends ?? null
    return {
      id: f.id ?? "",
      event: p.event ?? "Alert",
      headline: p.headline ?? "",
      severity: p.severity ?? "Unknown",
      urgency: p.urgency ?? "Unknown",
      certainty: p.certainty ?? "Unknown",
      area: p.areaDesc ?? "",
      effective: p.effective ?? null,
      ends,
      expires: p.expires ?? null,
      sent: p.sent ?? null,
      sameCodes: uniq((p.geocode?.SAME ?? []).map(String)),
      ugcCodes: uniq((p.geocode?.UGC ?? []).map(String)),
      geometry: f.geometry ?? null,
      links: { nws: f.id ?? "" },
    }
  })

  // Sort: highest severity first, then soonest ending
  const sevRank: Record<string, number> = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1, Unknown: 0 }
  alerts.sort((a, b) => {
    const s = (sevRank[b.severity] ?? 0) - (sevRank[a.severity] ?? 0)
    if (s !== 0) return s
    const aEnd = Date.parse((a.ends ?? a.expires ?? "") as string) || Number.POSITIVE_INFINITY
    const bEnd = Date.parse((b.ends ?? b.expires ?? "") as string) || Number.POSITIVE_INFINITY
    return aEnd - bEnd
  })

  return {
    stationId,
    serviceAreaName: cfg.serviceAreaName,
    generatedAt: new Date().toISOString(),
    source: "nws",
    alerts,
  }
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ stationId: string }> }
) {
  const { stationId } = await ctx.params
  if (!STATION_ALERTS[stationId]) {
    return NextResponse.json({ error: "unknown stationId" }, { status: 404 })
  }

  const cached = await getCachedValue(
    {
      key: `radio:station-alerts:${stationId}`,
      ttlMs: 60_000,
      staleTtlMs: 5 * 60_000,
    },
    async () => {
      const payload = await buildStationAlerts(stationId)
      if (!payload) throw new Error("unknown stationId")
      return payload
    },
  )

  return NextResponse.json(cached.value, {
    headers: {
      "Cache-Control": cacheControlHeader(60, 300),
      "X-SeasonalNet-Cache": cached.status,
    },
  })
}
