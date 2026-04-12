import "server-only"

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
  configHash: string | null
  error?: string
}

const API_BASE = process.env.SEASONALWEATHER_API_BASE
const READ_TOKEN = process.env.SEASONALWEATHER_READ_TOKEN
const CONTROL_TOKEN = process.env.SEASONALWEATHER_CONTROL_TOKEN
const ORIGINATE_TOKEN = process.env.SEASONALWEATHER_ORIGINATE_TOKEN
const CONFIG_TOKEN = process.env.SEASONALWEATHER_CONFIG_TOKEN || CONTROL_TOKEN

type TokenKind = "read" | "control" | "originate" | "config"

function getToken(kind: TokenKind) {
  switch (kind) {
    case "control":
      return CONTROL_TOKEN
    case "originate":
      return ORIGINATE_TOKEN
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
  headers.set("Accept", "application/json")

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    next: { revalidate: 10 },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`${path} returned ${res.status}${body ? `: ${body}` : ""}`)
  }

  return res.json()
}

export async function getSeasonalWeatherOverview(): Promise<SeasonalWeatherOverview> {
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
      configHash: null,
      error: "Backend wiring not configured yet.",
    }
  }

  try {
    const [health, status] = await Promise.all([
      seasonalWeatherFetch("/v1/health"),
      seasonalWeatherFetch("/v1/status"),
    ])

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
      configHash: null,
      error: error instanceof Error ? error.message : "Unable to reach SeasonalWeather.",
    }
  }
}
