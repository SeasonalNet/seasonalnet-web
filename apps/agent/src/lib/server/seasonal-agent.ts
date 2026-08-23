import "server-only"

import { fetchWithTimeout, isTimeoutError } from "@seasonalnet/shell/src/lib/fetch"

const BASE_URL =
  process.env.SEASONAL_AGENT_BASE_URL?.replace(/\/+$/, "") ||
  "http://127.0.0.1:8765"

const API_TOKEN = process.env.SEASONAL_AGENT_API_TOKEN

export function seasonalAgentBaseUrl() {
  return BASE_URL
}

function seasonalAgentToken() {
  if (!API_TOKEN) {
    throw new Error("Missing SEASONAL_AGENT_API_TOKEN for @seasonalnet/agent")
  }

  return API_TOKEN
}

export function seasonalAgentHeaders(init?: HeadersInit) {
  const headers = new Headers(init)
  headers.set("Authorization", `Bearer ${seasonalAgentToken()}`)
  return headers
}

async function readSeasonalAgentPayload(response: Response) {
  const contentType = response.headers.get("content-type") || ""
  const rawBody = await response.text()

  if (!contentType.includes("application/json")) {
    return rawBody
  }

  if (!rawBody.trim()) {
    return { ok: response.ok, status: response.status, error: "Empty JSON response." }
  }

  try {
    return JSON.parse(rawBody) as unknown
  } catch {
    return { ok: response.ok, status: response.status, error: "Invalid JSON response.", raw_body: rawBody }
  }
}

export async function seasonalAgentJson(path: string, init: RequestInit = {}) {
  let response: Response
  try {
    response = await fetchWithTimeout(`${BASE_URL}${path}`, {
      ...init,
      headers: seasonalAgentHeaders(init.headers),
      cache: "no-store",
    })
  } catch (error) {
    const missingConfiguration = error instanceof Error && error.message.includes("SEASONAL_AGENT_API_TOKEN")
    const status = missingConfiguration ? 503 : isTimeoutError(error) ? 504 : 502
    return {
      ok: false,
      status,
      payload: {
        type: "/problems/upstream-agent-unavailable",
        title: missingConfiguration ? "Seasonal Agent is not configured" : "Seasonal Agent is unavailable",
        status,
        detail: missingConfiguration
          ? "The Seasonal Agent integration is not configured."
          : status === 504
            ? "The Seasonal Agent request timed out."
            : "The Seasonal Agent service could not be reached.",
      },
    }
  }

  const payload = await readSeasonalAgentPayload(response)

  return {
    ok: response.ok,
    status: response.status,
    payload,
  }
}
