import { describe, expect, it } from "vitest"

import type { SeasonalWeatherOverview } from "../../server/modules/seasonalweather"
import { buildSeasonalWeatherModule } from "./seasonalweather"

function overview(overrides: Partial<SeasonalWeatherOverview> = {}): SeasonalWeatherOverview {
  return {
    configured: true,
    reachable: true,
    apiVersion: "1",
    healthOk: true,
    mode: "normal",
    heightenedUntil: null,
    lastProduct: "Tornado Warning",
    liquidsoapReachable: true,
    liveTimeEnabled: true,
    rebroadcastEnabled: false,
    queueSizes: { nwws: 1, cap: 2, ern: 3 },
    inserts: { active: 2, nextAirAt: "2026-08-23T12:00:00Z" },
    configHash: "1234567890abcdef",
    ...overrides,
  }
}

function statusValues(adminModule: ReturnType<typeof buildSeasonalWeatherModule>) {
  return Object.fromEntries((adminModule.groups[0]?.statusItems ?? []).map((item) => [item.label, item]))
}

describe("buildSeasonalWeatherModule", () => {
  it("builds live status and control actions from a reachable overview", () => {
    const adminModule = buildSeasonalWeatherModule(overview())
    const statuses = statusValues(adminModule)

    expect(adminModule).toMatchObject({ readiness: "live", tags: ["weather", "automation", "live"] })
    expect(statuses.API).toMatchObject({ value: "Ready · v1", tone: "success" })
    expect(statuses.Queues.value).toBe("NWWS 1 · CAP 2 · ERN 3")
    expect(statuses["Cycle inserts"]).toMatchObject({ value: "2 active · next 2026-08-23T12:00:00Z", tone: "warning" })
    expect(statuses["Live time"]).toMatchObject({ value: "Enabled", tone: "success" })
    expect(statuses.Rebroadcast).toMatchObject({ value: "Disabled", tone: "warning" })
    expect(statuses.Config.value).toBe("1234567890ab…")
    expect(adminModule.groups.flatMap((group) => group.actions ?? []).every((action) => action.state === "live")).toBe(true)
  })

  it("represents an unwired backend without enabling controls", () => {
    const adminModule = buildSeasonalWeatherModule(overview({
      configured: false,
      reachable: false,
      apiVersion: null,
      mode: null,
      liquidsoapReachable: null,
      liveTimeEnabled: null,
      rebroadcastEnabled: null,
      queueSizes: { nwws: null, cap: null, ern: null },
      inserts: { active: null, nextAirAt: null },
      lastProduct: null,
      configHash: null,
      error: "Backend wiring not configured yet.",
    }))
    const statuses = statusValues(adminModule)

    expect(adminModule).toMatchObject({
      summary: "Backend wiring not configured yet.",
      readiness: "scaffolded",
      tags: ["weather", "automation", "scaffolded"],
    })
    expect(statuses.API).toMatchObject({ value: "Not wired", tone: "muted" })
    expect(statuses.Mode.value).toBe("Pending")
    expect(statuses.Liquidsoap.value).toBe("Unknown")
    expect(statuses.Queues.value).toBe("Unknown")
    expect(statuses["Cycle inserts"].value).toBe("Unknown")
    expect(adminModule.groups.flatMap((group) => group.actions ?? []).every((action) => action.state === "scaffolded")).toBe(true)
  })

  it("surfaces an offline configured backend and heightened mode", () => {
    const adminModule = buildSeasonalWeatherModule(overview({ reachable: false, apiVersion: null, mode: "heightened" }))
    const statuses = statusValues(adminModule)

    expect(adminModule.tags).toContain("backend")
    expect(statuses.API).toMatchObject({ value: "Offline", tone: "danger" })
    expect(statuses.Mode).toMatchObject({ value: "heightened", tone: "warning" })
  })
})
