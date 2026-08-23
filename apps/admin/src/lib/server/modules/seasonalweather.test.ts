import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@seasonalnet/shell/src/lib/server/cache", () => ({
  getCachedValue: async (_policy: unknown, load: () => Promise<unknown>) => ({ value: await load(), state: "miss" }),
}))

const keys = [
  "SEASONALWEATHER_API_BASE",
  "SEASONALWEATHER_READ_TOKEN",
  "SEASONALWEATHER_CONTROL_TOKEN",
  "SEASONALWEATHER_INSERTS_TOKEN",
] as const
const originals = Object.fromEntries(keys.map((key) => [key, process.env[key]]))

async function loadOverview(configured = true) {
  vi.resetModules()
  for (const key of keys) delete process.env[key]
  if (configured) {
    process.env.SEASONALWEATHER_API_BASE = "http://weather.internal///"
    process.env.SEASONALWEATHER_READ_TOKEN = "read-token"
    process.env.SEASONALWEATHER_INSERTS_TOKEN = "inserts-token"
  }
  return import("./seasonalweather")
}

afterEach(() => {
  vi.unstubAllGlobals()
  for (const key of keys) {
    const value = originals[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe("SeasonalWeather overview", () => {
  it("returns the explicit unwired state when required configuration is absent", async () => {
    const { getSeasonalWeatherOverview } = await loadOverview(false)
    await expect(getSeasonalWeatherOverview()).resolves.toMatchObject({
      configured: false,
      reachable: false,
      error: "Backend wiring not configured yet.",
    })
  })

  it("combines runtime status and sorts the next scheduled insert", async () => {
    vi.stubGlobal("fetch", vi.fn((input: URL | RequestInfo) => {
      const url = String(input)
      if (url.endsWith("/v1/health")) return Promise.resolve(Response.json({ ok: true, api: { version: "1" } }))
      if (url.endsWith("/v1/status")) return Promise.resolve(Response.json({
        mode: "heightened",
        heightened_until: "2026-08-23T12:00:00Z",
        last_product_desc: "Tornado Warning",
        liquidsoap_telnet_reachable: true,
        live_time_enabled: false,
        rebroadcast_enabled: true,
        nwws_queue_size: 1,
        cap_queue_size: 2,
        ern_queue_size: 3,
        config_sha256: "abc",
      }))
      return Promise.resolve(Response.json({ inserts: [
        { estimated_next_air_at: "2026-08-23T12:02:00Z" },
        { estimated_next_air_at: "2026-08-23T12:01:00Z" },
      ] }))
    }))
    const { getSeasonalWeatherOverview } = await loadOverview()

    await expect(getSeasonalWeatherOverview()).resolves.toMatchObject({
      configured: true,
      reachable: true,
      mode: "heightened",
      queueSizes: { nwws: 1, cap: 2, ern: 3 },
      inserts: { active: 2, nextAirAt: "2026-08-23T12:01:00Z" },
    })
  })

  it("returns an offline overview with a structured upstream problem detail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(Response.json({
      type: "/problems/unavailable",
      title: "Unavailable",
      status: 503,
      detail: "Weather runtime is restarting.",
    }, { status: 503 }))))
    const { getSeasonalWeatherOverview } = await loadOverview()

    await expect(getSeasonalWeatherOverview()).resolves.toMatchObject({
      configured: true,
      reachable: false,
      error: "Weather runtime is restarting.",
    })
  })
})
