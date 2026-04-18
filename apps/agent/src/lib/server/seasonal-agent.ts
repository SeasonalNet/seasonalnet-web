import "server-only"

const BASE_URL =
  process.env.SEASONAL_AGENT_BASE_URL?.replace(/\/+$/, "") ||
  "http://127.0.0.1:8765"

const API_TOKEN = process.env.SEASONAL_AGENT_API_TOKEN

export function seasonalAgentBaseUrl() {
  return BASE_URL
}

export function seasonalAgentToken() {
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
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: seasonalAgentHeaders(init.headers),
    cache: "no-store",
  })

  const payload = await readSeasonalAgentPayload(response)

  return {
    ok: response.ok,
    status: response.status,
    payload,
  }
}
