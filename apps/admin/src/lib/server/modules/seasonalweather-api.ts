import "server-only"

import { randomUUID } from "crypto"

export type SeasonalWeatherCapability =
  | "read"
  | "control"
  | "originate"
  | "config"

const BASE_URL = process.env.SEASONALWEATHER_API_BASE?.trim().replace(/\/+$/, "")

const TOKENS: Record<SeasonalWeatherCapability, string | undefined> = {
  read: process.env.SEASONALWEATHER_READ_TOKEN,
  control: process.env.SEASONALWEATHER_CONTROL_TOKEN,
  originate: process.env.SEASONALWEATHER_ORIGINATE_TOKEN,
  config: process.env.SEASONALWEATHER_CONFIG_TOKEN || process.env.SEASONALWEATHER_CONTROL_TOKEN,
}

type SeasonalWeatherErrorBody = {
  error?: string | { message?: string; code?: string; details?: unknown }
  request_id?: string
  [key: string]: unknown
}

export class SeasonalWeatherApiError extends Error {
  status: number
  body: SeasonalWeatherErrorBody | string | null

  constructor(message: string, status: number, body: SeasonalWeatherErrorBody | string | null = null) {
    super(message)
    this.name = "SeasonalWeatherApiError"
    this.status = status
    this.body = body
  }
}

function errorMessageFromBody(body: SeasonalWeatherErrorBody | string | null, fallback: string) {
  if (!body) return fallback
  if (typeof body === "string") return body || fallback

  const error = body.error
  if (typeof error === "string") return error
  if (error && typeof error.message === "string") return error.message

  return fallback
}

async function readResponseBody(res: Response): Promise<SeasonalWeatherErrorBody | string | null> {
  const text = await res.text().catch(() => "")
  if (!text) return null

  try {
    return JSON.parse(text) as SeasonalWeatherErrorBody
  } catch {
    return text
  }
}

export async function seasonalWeatherApi(
  upstreamPath: string,
  init: RequestInit = {},
  capability: SeasonalWeatherCapability = "read"
) {
  if (!BASE_URL) {
    throw new SeasonalWeatherApiError(
      "SEASONALWEATHER_API_BASE is not set for the admin app runtime.",
      500
    )
  }

  const token = TOKENS[capability]

  if (!token) {
    throw new SeasonalWeatherApiError(
      `Missing SeasonalWeather token for capability: ${capability}`,
      500
    )
  }

  const method = (init.method || "GET").toUpperCase()
  const headers = new Headers(init.headers)

  headers.set("Authorization", `Bearer ${token}`)
  headers.set("Accept", "application/json")

  const isMutating = method !== "GET" && method !== "HEAD"
  const isAudioUpload = upstreamPath === "/v1/uploads/audio"

  if (isMutating && !isAudioUpload) {
    headers.set("Idempotency-Key", headers.get("Idempotency-Key") || randomUUID())
  }

  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${upstreamPath}`, {
      ...init,
      method,
      headers,
      cache: "no-store",
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : "fetch failed"
    throw new SeasonalWeatherApiError(
      `Unable to reach SeasonalWeather API at ${BASE_URL}: ${detail}`,
      502
    )
  }

  const contentType = res.headers.get("content-type") || ""

  if (!res.ok) {
    const body = await readResponseBody(res)
    throw new SeasonalWeatherApiError(
      errorMessageFromBody(body, `SeasonalWeather API request failed: ${res.status}`),
      res.status,
      body
    )
  }

  if (contentType.includes("application/json")) {
    return res.json()
  }

  return res.text()
}
