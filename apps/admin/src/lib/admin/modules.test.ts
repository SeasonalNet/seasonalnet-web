import { describe, expect, it } from "vitest"

import type { SeasonalApidOverview } from "../server/modules/seasonalapid"
import type { SeasonalProvisioningOverview } from "../server/modules/seasonalprovisioning"
import type { SeasonalWeatherOverview } from "../server/modules/seasonalweather"
import { buildAdminModules } from "./modules"
import { buildSeasonalApidModule } from "./modules/seasonalapid"
import { buildSeasonalPbxModule } from "./modules/seasonalpbx"
import { buildSeasonalProvModule } from "./modules/seasonalprov"
import { buildSeasonalRadioModule } from "./modules/seasonalradio"

const apid: SeasonalApidOverview = {
  configured: true,
  reachable: true,
  baseUrl: "http://apid.internal",
  healthOk: true,
  readyOk: true,
  apiVersion: "1",
  openApiVersion: "3.1.0",
  openApiTitle: "SeasonalAPID",
  routeCount: 1,
  publicAnnouncementCount: 2,
  publicAnnouncementsServedAt: "2026-08-23T12:00:00Z",
}

const provisioning: SeasonalProvisioningOverview = {
  configured: true,
  reachable: true,
  rootPath: "/srv/prov",
  publicBaseUrl: "https://prov.seasonalnet.org",
  indexPresent: true,
  wallpaperCount: 3,
  wallpaperFiles: ["a.png", "b.png", "c.png"],
  cmeDesktopCount: 1,
  tokenEntryCount: 2,
  pbxSyncPresent: true,
  pbxSyncEntryCount: 1,
  updatedAt: "2026-08-23T12:00:00Z",
}

const weather: SeasonalWeatherOverview = {
  configured: true,
  reachable: true,
  apiVersion: "1",
  healthOk: true,
  mode: "normal",
  heightenedUntil: null,
  lastProduct: null,
  liquidsoapReachable: true,
  liveTimeEnabled: true,
  rebroadcastEnabled: true,
  queueSizes: { nwws: 0, cap: 0, ern: 0 },
  inserts: { active: 0, nextAirAt: null },
  configHash: null,
}

describe("admin module builders", () => {
  it("assembles all control-plane modules in the expected order", () => {
    expect(buildAdminModules(weather, provisioning, apid).map((item) => item.id)).toEqual([
      "seasonalweather",
      "seasonalprovisioning",
      "seasonalapid",
      "seasonalpbx",
      "seasonalradio",
    ])
  })

  it("formats a live APID overview and its singular/plural counters", () => {
    const live = buildSeasonalApidModule(apid)
    const status = live.groups[0]?.statusItems ?? []
    expect(live.readiness).toBe("live")
    expect(status.find((item) => item.label === "Contract")?.value).toBe("3.1.0 · 1 route")
    expect(status.find((item) => item.label === "Announcements")?.value).toBe("2 announcements")
    expect(status.find((item) => item.label === "Updated")?.value).not.toBe("Unknown")

    const offline = buildSeasonalApidModule({
      ...apid,
      configured: false,
      reachable: false,
      healthOk: null,
      readyOk: false,
      openApiVersion: null,
      routeCount: null,
      publicAnnouncementCount: null,
      publicAnnouncementsServedAt: "invalid",
      error: "offline",
    })
    expect(offline.summary).toBe("offline")
    expect(offline.readiness).toBe("scaffolded")
    expect(offline.groups[0]?.statusItems?.find((item) => item.label === "API")?.value).toBe("Not wired")
  })

  it("formats provisioning inventories and degraded states", () => {
    const live = buildSeasonalProvModule(provisioning)
    const status = live.groups[0]?.statusItems ?? []
    expect(status.find((item) => item.label === "Wallpapers")?.value).toBe("3 files · a.png, b.png +1")
    expect(status.find((item) => item.label === "CME assets")?.value).toBe("1 entry")

    const degraded = buildSeasonalProvModule({
      ...provisioning,
      reachable: false,
      indexPresent: false,
      wallpaperCount: null,
      wallpaperFiles: [],
      cmeDesktopCount: null,
      tokenEntryCount: null,
      pbxSyncPresent: false,
      pbxSyncEntryCount: null,
      updatedAt: null,
      error: "missing",
    })
    expect(degraded.summary).toBe("missing")
    expect(degraded.readiness).toBe("scaffolded")
  })

  it("keeps PBX and Radio modules explicitly scaffolded", () => {
    expect(buildSeasonalPbxModule()).toMatchObject({ id: "seasonalpbx", readiness: "scaffolded" })
    expect(buildSeasonalRadioModule()).toMatchObject({ id: "seasonalradio", readiness: "scaffolded" })
  })
})
