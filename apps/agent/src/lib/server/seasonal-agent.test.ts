import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const originalToken = process.env.SEASONAL_AGENT_API_TOKEN
const originalBaseUrl = process.env.SEASONAL_AGENT_BASE_URL

async function loadClient(token: string | null = "test-token") {
  vi.resetModules()
  if (token === null) delete process.env.SEASONAL_AGENT_API_TOKEN
  else process.env.SEASONAL_AGENT_API_TOKEN = token
  process.env.SEASONAL_AGENT_BASE_URL = "http://agent.internal///"
  return import("./seasonal-agent")
}

afterEach(() => {
  vi.unstubAllGlobals()
  if (originalToken === undefined) delete process.env.SEASONAL_AGENT_API_TOKEN
  else process.env.SEASONAL_AGENT_API_TOKEN = originalToken
  if (originalBaseUrl === undefined) delete process.env.SEASONAL_AGENT_BASE_URL
  else process.env.SEASONAL_AGENT_BASE_URL = originalBaseUrl
})

describe("seasonalAgentJson", () => {
  it("sends authenticated no-store requests and parses JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ answer: "ok" }, { status: 202 }))
    vi.stubGlobal("fetch", fetchMock)
    const { seasonalAgentBaseUrl, seasonalAgentJson } = await loadClient()

    const result = await seasonalAgentJson("/v1/chat", { method: "POST", body: "{}" })

    expect(seasonalAgentBaseUrl()).toBe("http://agent.internal")
    expect(result).toEqual({ ok: true, status: 202, payload: { answer: "ok" } })
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer test-token")
    expect(init.cache).toBe("no-store")
  })

  it("reports missing configuration without exposing environment details", async () => {
    const { seasonalAgentJson } = await loadClient(null)

    const result = await seasonalAgentJson("/v1/health")

    expect(result).toMatchObject({ ok: false, status: 503 })
    expect(JSON.stringify(result)).not.toContain("SEASONAL_AGENT_API_TOKEN")
  })

  it.each([
    [new DOMException("private timeout", "TimeoutError"), 504, "timed out"],
    [new Error("private network detail"), 502, "could not be reached"],
  ] as const)("sanitizes an upstream failure", async (error, status, detail) => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error))
    const { seasonalAgentJson } = await loadClient()

    const result = await seasonalAgentJson("/v1/health")

    expect(result).toMatchObject({ ok: false, status, payload: { detail: expect.stringContaining(detail) } })
    expect(JSON.stringify(result)).not.toContain(error.message)
  })

  it("handles empty, invalid, and non-JSON upstream bodies", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response("{broken", { status: 502, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response("ready", { headers: { "content-type": "text/plain" } }))
    vi.stubGlobal("fetch", fetchMock)
    const { seasonalAgentJson } = await loadClient()

    await expect(seasonalAgentJson("/empty")).resolves.toMatchObject({ payload: { error: "Empty JSON response." } })
    await expect(seasonalAgentJson("/invalid")).resolves.toMatchObject({ ok: false, payload: { error: "Invalid JSON response." } })
    await expect(seasonalAgentJson("/text")).resolves.toMatchObject({ payload: "ready" })
  })
})
