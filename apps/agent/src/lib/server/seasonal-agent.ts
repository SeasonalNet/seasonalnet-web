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

export async function seasonalAgentJson(path: string, init: RequestInit = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: seasonalAgentHeaders(init.headers),
    cache: "no-store",
  })

  const contentType = response.headers.get("content-type") || ""
  const isJson = contentType.includes("application/json")
  const payload = isJson ? await response.json() : await response.text()

  return {
    ok: response.ok,
    status: response.status,
    payload,
  }
}
