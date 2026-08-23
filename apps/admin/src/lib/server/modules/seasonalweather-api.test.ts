import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const environmentKeys = [
  "SEASONALWEATHER_API_BASE",
  "SEASONALWEATHER_READ_TOKEN",
  "SEASONALWEATHER_CONTROL_TOKEN",
  "SEASONALWEATHER_ORIGINATE_TOKEN",
  "SEASONALWEATHER_INSERTS_TOKEN",
  "SEASONALWEATHER_CONFIG_TOKEN",
] as const
const originalEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]))

async function loadApi(options: { base?: string; readToken?: string; controlToken?: string } = {}) {
  vi.resetModules()
  for (const key of environmentKeys) delete process.env[key]
  if (options.base !== undefined) process.env.SEASONALWEATHER_API_BASE = options.base
  if (options.readToken !== undefined) process.env.SEASONALWEATHER_READ_TOKEN = options.readToken
  if (options.controlToken !== undefined) process.env.SEASONALWEATHER_CONTROL_TOKEN = options.controlToken
  return import("./seasonalweather-api")
}

afterEach(() => {
  vi.unstubAllGlobals()
  for (const key of environmentKeys) {
    const value = originalEnvironment[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe("seasonalWeatherApi", () => {
  it("fails closed when base URL or capability credentials are missing", async () => {
    const missingBase = await loadApi({ readToken: "read" })
    await expect(missingBase.seasonalWeatherApi("/v1/status")).rejects.toMatchObject({ status: 500 })

    const missingToken = await loadApi({ base: "http://weather.internal" })
    await expect(missingToken.seasonalWeatherApi("/v1/status")).rejects.toThrow("Missing SeasonalWeather token")
  })

  it("authenticates reads and parses JSON success responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }))
    vi.stubGlobal("fetch", fetchMock)
    const { seasonalWeatherApi } = await loadApi({ base: "http://weather.internal///", readToken: "read-token" })

    await expect(seasonalWeatherApi("/v1/status")).resolves.toEqual({ ok: true })
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("http://weather.internal/v1/status")
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer read-token")
    expect(new Headers(init.headers).has("idempotency-key")).toBe(false)
  })

  it("adds mutation safety headers and returns text responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("accepted", { status: 202 }))
    vi.stubGlobal("fetch", fetchMock)
    const { seasonalWeatherApi } = await loadApi({ base: "http://weather.internal", controlToken: "control-token" })

    await expect(seasonalWeatherApi("/v1/cycle/rebuild", { method: "POST", body: "{}" }, "control")).resolves.toBe("accepted")
    const headers = new Headers((fetchMock.mock.calls[0]?.[1] as RequestInit).headers)
    expect(headers.get("authorization")).toBe("Bearer control-token")
    expect(headers.get("content-type")).toBe("application/json")
    expect(headers.get("idempotency-key")).toBeTruthy()
  })

  it("preserves structured problems but does not use raw text as a public summary", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({
        type: "/problems/conflict",
        title: "Conflict",
        status: 409,
        detail: "A cycle rebuild is already active.",
      }, { status: 409 }))
      .mockResolvedValueOnce(new Response("private stack trace", { status: 500 }))
    vi.stubGlobal("fetch", fetchMock)
    const api = await loadApi({ base: "http://weather.internal", readToken: "read-token" })

    await expect(api.seasonalWeatherApi("/problem")).rejects.toMatchObject({
      status: 409,
      message: "A cycle rebuild is already active.",
      problem: { type: "/problems/conflict" },
    })
    let caught: unknown
    try {
      await api.seasonalWeatherApi("/text-error")
    } catch (error) {
      caught = error
    }
    expect(caught).toMatchObject({ status: 500, message: "SeasonalWeather API request failed: 500" })
    expect(api.seasonalWeatherProblemSummary("private stack trace", "safe fallback")).toBe("safe fallback")
  })

  it("sanitizes transport failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("private host refused")))
    const { seasonalWeatherApi } = await loadApi({ base: "http://weather.internal", readToken: "read-token" })

    await expect(seasonalWeatherApi("/v1/status")).rejects.toMatchObject({
      status: 502,
      message: "The SeasonalWeather API is temporarily unavailable.",
    })
  })
})
