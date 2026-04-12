import "server-only"

import { randomUUID } from "crypto"

export type SeasonalWeatherCapability =
  | "read"
  | "control"
  | "originate"
  | "config"

const BASE_URL =
  process.env.SEASONALWEATHER_API_BASE?.replace(/\/+$/, "") ||
  "http://127.0.0.1:9081"

const TOKENS: Record<SeasonalWeatherCapability, string | undefined> = {
  read: process.env.SEASONALWEATHER_READ_TOKEN,
  control: process.env.SEASONALWEATHER_CONTROL_TOKEN,
  originate: process.env.SEASONALWEATHER_ORIGINATE_TOKEN,
  config: process.env.SEASONALWEATHER_CONFIG_TOKEN,
}

export async function seasonalWeatherApi(
  upstreamPath: string,
  init: RequestInit = {},
  capability: SeasonalWeatherCapability = "read"
) {
  const token = TOKENS[capability]

  if (!token) {
    throw new Error(`Missing SeasonalWeather token for capability: ${capability}`)
  }

  const method = (init.method || "GET").toUpperCase()
  const headers = new Headers(init.headers)

  headers.set("Authorization", `Bearer ${token}`)

  const isMutating = method !== "GET" && method !== "HEAD"
  const isAudioUpload = upstreamPath === "/v1/uploads/audio"

  if (isMutating && !isAudioUpload) {
    headers.set("Idempotency-Key", headers.get("Idempotency-Key") || randomUUID())
  }

  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const res = await fetch(`${BASE_URL}${upstreamPath}`, {
    ...init,
    method,
    headers,
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `SeasonalWeather API request failed: ${res.status}`)
  }

  const contentType = res.headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    return res.json()
  }

  return res.text()
}
