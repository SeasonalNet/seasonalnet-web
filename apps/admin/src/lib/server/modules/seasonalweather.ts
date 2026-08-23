import "server-only"

import { getCachedValue } from "@seasonalnet/shell/src/lib/server/cache"
import { fetchWithTimeout } from "@seasonalnet/shell/src/lib/fetch"

export type SeasonalWeatherOverview = {
  configured: boolean
  reachable: boolean
  apiVersion: string | null
  healthOk: boolean | null
  mode: string | null
  heightenedUntil: string | null
  lastProduct: string | null
  liquidsoapReachable: boolean | null
  liveTimeEnabled: boolean | null
  rebroadcastEnabled: boolean | null
  queueSizes: {
    nwws: number | null
    cap: number | null
    ern: number | null
  }
  inserts: {
    active: number | null
    nextAirAt: string | null
  }
  configHash: string | null
  error?: string
}

const API_BASE = process.env.SEASONALWEATHER_API_BASE?.trim().replace(/\/+$/, "")
const READ_TOKEN = process.env.SEASONALWEATHER_READ_TOKEN
const CONTROL_TOKEN = process.env.SEASONALWEATHER_CONTROL_TOKEN
const ORIGINATE_TOKEN = process.env.SEASONALWEATHER_ORIGINATE_TOKEN
const INSERTS_TOKEN = process.env.SEASONALWEATHER_INSERTS_TOKEN || CONTROL_TOKEN
const CONFIG_TOKEN = process.env.SEASONALWEATHER_CONFIG_TOKEN || CONTROL_TOKEN

type TokenKind = "read" | "control" | "originate" | "inserts" | "config"

type ProblemDetails = {
  type?: string
  title?: string
  status?: number
  detail?: string
  code?: string
  request_id?: string
}

function isProblemDetails(value: unknown): value is ProblemDetails {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function problemSummary(value: unknown, fallback: string) {
  if (!isProblemDetails(value)) return fallback
  const detail = typeof value.detail === "string" ? value.detail : null
  const title = typeof value.title === "string" ? value.title : null
  return detail || title || fallback
}

async function readErrorBody(res: Response) {
  const text = await res.text().catch(() => "")
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function getToken(kind: TokenKind) {
  switch (kind) {
    case "control":
      return CONTROL_TOKEN
    case "originate":
      return ORIGINATE_TOKEN
    case "inserts":
      return INSERTS_TOKEN
    case "config":
      return CONFIG_TOKEN
    case "read":
    default:
      return READ_TOKEN
  }
}

async function seasonalWeatherFetch(path: string, init: RequestInit = {}, tokenKind: TokenKind = "read") {
  if (!API_BASE) {
    throw new Error("SEASONALWEATHER_API_BASE is not set")
  }

  const token = getToken(tokenKind)
  if (!token) {
    throw new Error(`Missing token for ${tokenKind} access`)
  }

  const headers = new Headers(init.headers)
  headers.set("Authorization", `Bearer ${token}`)
  headers.set("Accept", "application/json, application/problem+json")

  const res = await fetchWithTimeout(`${API_BASE}${path}`, {
    ...init,
    headers,
    next: { revalidate: 10 },
  })

  if (!res.ok) {
    const body = await readErrorBody(res)
    const detail = problemSummary(body, `${path} returned ${res.status}`)
    throw new Error(detail)
  }

  return res.json()
}

async function getSeasonalWeatherOverviewFresh(): Promise<SeasonalWeatherOverview> {
  if (!API_BASE || !READ_TOKEN) {
    return {
      configured: false,
      reachable: false,
      apiVersion: null,
      healthOk: null,
      mode: null,
      heightenedUntil: null,
      lastProduct: null,
      liquidsoapReachable: null,
      liveTimeEnabled: null,
      rebroadcastEnabled: null,
      queueSizes: { nwws: null, cap: null, ern: null },
      inserts: { active: null, nextAirAt: null },
      configHash: null,
      error: "Backend wiring not configured yet.",
    }
  }

  try {
    const [health, status, insertList] = await Promise.all([
      seasonalWeatherFetch("/v1/health"),
      seasonalWeatherFetch("/v1/status"),
      INSERTS_TOKEN
        ? seasonalWeatherFetch("/v1/inserts?limit=25", {}, "inserts").catch(() => null)
        : Promise.resolve(null),
    ])

    const inserts = Array.isArray(insertList?.inserts) ? insertList.inserts : null
    const nextAirAt = inserts
      ?.map((item: { estimated_next_air_at?: unknown }) => item.estimated_next_air_at)
      .filter((value: unknown): value is string => typeof value === "string" && value.length > 0)
      .sort()[0] ?? null

    return {
      configured: true,
      reachable: true,
      apiVersion: health?.api?.version ?? null,
      healthOk: Boolean(health?.ok),
      mode: status?.mode ?? null,
      heightenedUntil: status?.heightened_until ?? null,
      lastProduct: status?.last_product_desc ?? null,
      liquidsoapReachable: typeof status?.liquidsoap_telnet_reachable === "boolean" ? status.liquidsoap_telnet_reachable : null,
      liveTimeEnabled: typeof status?.live_time_enabled === "boolean" ? status.live_time_enabled : null,
      rebroadcastEnabled: typeof status?.rebroadcast_enabled === "boolean" ? status.rebroadcast_enabled : null,
      queueSizes: {
        nwws: typeof status?.nwws_queue_size === "number" ? status.nwws_queue_size : null,
        cap: typeof status?.cap_queue_size === "number" ? status.cap_queue_size : null,
        ern: typeof status?.ern_queue_size === "number" ? status.ern_queue_size : null,
      },
      inserts: {
        active: inserts ? inserts.length : null,
        nextAirAt,
      },
      configHash: status?.config_sha256 ?? null,
    }
  } catch (error) {
    return {
      configured: true,
      reachable: false,
      apiVersion: null,
      healthOk: null,
      mode: null,
      heightenedUntil: null,
      lastProduct: null,
      liquidsoapReachable: null,
      liveTimeEnabled: null,
      rebroadcastEnabled: null,
      queueSizes: { nwws: null, cap: null, ern: null },
      inserts: { active: null, nextAirAt: null },
      configHash: null,
      error: error instanceof Error ? error.message : "Unable to reach SeasonalWeather.",
    }
  }
}

export async function getSeasonalWeatherOverview(): Promise<SeasonalWeatherOverview> {
  const cached = await getCachedValue(
    {
      key: "admin:seasonalweather:overview",
      ttlMs: 10_000,
      staleTtlMs: 60_000,
    },
    getSeasonalWeatherOverviewFresh,
  )

  return cached.value
}
