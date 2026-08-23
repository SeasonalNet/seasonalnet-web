import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@seasonalnet/shell/src/lib/server/cache", () => ({
  getCachedValue: async (_policy: unknown, load: () => Promise<unknown>) => ({ value: await load(), state: "miss" }),
}))

const originalBase = process.env.SEASONAL_APID_BASE_URL

async function loadOverview(base = "apid.internal///") {
  vi.resetModules()
  process.env.SEASONAL_APID_BASE_URL = base
  return import("./seasonalapid")
}

afterEach(() => {
  vi.unstubAllGlobals()
  if (originalBase === undefined) delete process.env.SEASONAL_APID_BASE_URL
  else process.env.SEASONAL_APID_BASE_URL = originalBase
})

describe("SeasonalAPID overview", () => {
  it("normalizes and combines health, readiness, contract, and announcement data", async () => {
    vi.stubGlobal("fetch", vi.fn((input: URL | RequestInfo) => {
      const url = String(input)
      if (url.endsWith("/healthz")) return Promise.resolve(Response.json({ data: { ok: true } }))
      if (url.endsWith("/readyz")) return Promise.resolve(Response.json({ ok: true }))
      if (url.endsWith("/openapi.json")) return Promise.resolve(Response.json({
        openapi: "3.1.0",
        info: { title: "SeasonalAPID", version: "2" },
        paths: { "/healthz": {}, "/readyz": {} },
      }))
      return Promise.resolve(Response.json({
        data: [{ id: "one" }],
        meta: { count: 1, servedAt: "2026-08-23T00:00:00Z", apiVersion: "3" },
      }))
    }))
    const { getSeasonalApidOverview } = await loadOverview()

    await expect(getSeasonalApidOverview()).resolves.toEqual({
      configured: true,
      reachable: true,
      baseUrl: "http://apid.internal",
      healthOk: true,
      readyOk: true,
      apiVersion: "3",
      openApiVersion: "3.1.0",
      openApiTitle: "SeasonalAPID",
      routeCount: 2,
      publicAnnouncementCount: 1,
      publicAnnouncementsServedAt: "2026-08-23T00:00:00Z",
    })
  })

  it("returns a bounded unreachable overview when all requests fail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")))
    const { getSeasonalApidOverview } = await loadOverview("http://apid.internal")

    await expect(getSeasonalApidOverview()).resolves.toMatchObject({
      configured: true,
      reachable: false,
      healthOk: null,
      readyOk: false,
      error: "connection refused",
    })
  })

  it("reports malformed base configuration without issuing requests", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const { getSeasonalApidOverview } = await loadOverview("http://[")

    await expect(getSeasonalApidOverview()).resolves.toMatchObject({ configured: false, reachable: false })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
