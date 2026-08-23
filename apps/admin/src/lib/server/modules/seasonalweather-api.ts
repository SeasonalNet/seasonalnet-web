import "server-only"

import { randomUUID } from "crypto"
import { fetchWithTimeout } from "@seasonalnet/shell/src/lib/fetch"

export type SeasonalWeatherCapability =
  | "read"
  | "control"
  | "originate"
  | "inserts"
  | "config"

const BASE_URL = process.env.SEASONALWEATHER_API_BASE?.trim().replace(/\/+$/, "")

const TOKENS: Record<SeasonalWeatherCapability, string | undefined> = {
  read: process.env.SEASONALWEATHER_READ_TOKEN,
  control: process.env.SEASONALWEATHER_CONTROL_TOKEN,
  originate: process.env.SEASONALWEATHER_ORIGINATE_TOKEN,
  inserts: process.env.SEASONALWEATHER_INSERTS_TOKEN || process.env.SEASONALWEATHER_CONTROL_TOKEN,
  config: process.env.SEASONALWEATHER_CONFIG_TOKEN || process.env.SEASONALWEATHER_CONTROL_TOKEN,
}

export type SeasonalWeatherProblemDetails = {
  type: string
  title: string
  status: number
  detail?: string
  instance?: string
  code?: string
  details?: Record<string, unknown>
  errors?: Array<Record<string, unknown>>
  request_id?: string
  [extension: string]: unknown
}

type LegacySeasonalWeatherErrorBody = {
  error?: string | { message?: string; code?: string; details?: unknown }
  request_id?: string
  [key: string]: unknown
}

type SeasonalWeatherErrorBody = SeasonalWeatherProblemDetails | LegacySeasonalWeatherErrorBody

export class SeasonalWeatherApiError extends Error {
  status: number
  body: SeasonalWeatherErrorBody | string | null
  problem: SeasonalWeatherProblemDetails | null

  constructor(message: string, status: number, body: SeasonalWeatherErrorBody | string | null = null) {
    super(message)
    this.name = "SeasonalWeatherApiError"
    this.status = status
    this.body = body
    this.problem = isProblemDetails(body) ? body : null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function isProblemDetails(value: unknown): value is SeasonalWeatherProblemDetails {
  return (
    isRecord(value) &&
    typeof value.type === "string" &&
    typeof value.title === "string" &&
    typeof value.status === "number"
  )
}

function legacyErrorMessage(error: LegacySeasonalWeatherErrorBody["error"]) {
  if (typeof error === "string") return error
  if (isRecord(error) && typeof error.message === "string") return error.message
  return null
}

export function seasonalWeatherProblemSummary(body: SeasonalWeatherErrorBody | string | null, fallback: string) {
  if (!body) return fallback
  if (typeof body === "string") return fallback

  if (isProblemDetails(body)) {
    const detail = typeof body.detail === "string" ? body.detail : null
    const title = typeof body.title === "string" ? body.title : null
    return detail || title || fallback
  }

  return legacyErrorMessage(body.error) || fallback
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
  headers.set("Accept", "application/json, application/problem+json")

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
    res = await fetchWithTimeout(`${BASE_URL}${upstreamPath}`, {
      ...init,
      method,
      headers,
      cache: "no-store",
    })
  } catch {
    throw new SeasonalWeatherApiError(
      "The SeasonalWeather API is temporarily unavailable.",
      502
    )
  }

  const contentType = res.headers.get("content-type") || ""

  if (!res.ok) {
    const body = await readResponseBody(res)
    throw new SeasonalWeatherApiError(
      seasonalWeatherProblemSummary(body, `SeasonalWeather API request failed: ${res.status}`),
      res.status,
      body
    )
  }

  if (contentType.includes("application/json")) {
    return res.json()
  }

  return res.text()
}
