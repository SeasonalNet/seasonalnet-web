import { afterEach, describe, expect, it } from "vitest"

import { site as adminSite } from "./admin/src/lib/site"
import { cn } from "./admin/src/lib/utils"
import { site as agentSite } from "./agent/src/lib/site"
import { site as docsSite } from "./docs/src/lib/site"
import { site as pbxSite } from "./pbx/src/lib/site"
import { site as provSite } from "./prov/src/lib/site"
import { RADIO_STATIONS } from "./radio/src/lib/radio-stations"
import {
  seasonalWeatherHandledAlertsUrl,
  seasonalWeatherIcecastStatusUrl,
  seasonalWeatherNowPlayingUrl,
} from "./radio/src/lib/server/seasonalweather-endpoints"
import { getStationMetaServerCfg } from "./radio/src/lib/server/station-metadata"
import { site as radioSite } from "./radio/src/lib/site"
import { STATION_ALERTS } from "./radio/src/lib/station-alert-config"
import { STATION_HANDLED_ALERTS } from "./radio/src/lib/station-handled-alert-config"
import { site as wwwSite } from "./www/src/lib/site"

const sites = [adminSite, agentSite, docsSite, pbxSite, provSite, radioSite, wwwSite]
const environmentKeys = [
  "SEASONALWEATHER_HOST",
  "SEASONALWEATHER_API_BASE_URL",
  "SEASONALWEATHER_API_BASE",
  "SEASONALWEATHER_HANDLED_ALERTS_URL",
  "SEASONALWEATHER_ICECAST_STATUS_URL",
  "SEASONALWEATHER_NOWPLAYING_URL",
] as const
const originalEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]))

afterEach(() => {
  for (const key of environmentKeys) {
    const value = originalEnvironment[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe("SPA site configuration contract", () => {
  it("gives every SPA a valid, unique portal navigation", () => {
    for (const site of sites) {
      expect(site.name).toBe("SeasonalNet")
      expect(site.portals.length).toBeGreaterThan(0)
      const keys = site.portals.map((portal) => portal.key)
      expect(new Set(keys).size).toBe(keys.length)
      for (const portal of site.portals) expect(new URL(portal.href).protocol).toBe("https:")
    }
  })

  it("keeps the public site navigation and featured portals internally consistent", () => {
    expect(wwwSite.portals.every((portal) => wwwSite.navigation.includes(portal))).toBe(true)
    expect(wwwSite.navigation[0]?.key).toBe("home")
  })

  it("merges conditional utility classes", () => {
    expect(cn("p-2", false && "hidden", "p-4")).toBe("p-4")
  })
})

describe("radio configuration contract", () => {
  it("connects every station and alert configuration to a known station", () => {
    const stationIds = new Set(RADIO_STATIONS.map((station) => station.id))
    expect(stationIds).toContain("jetstream")
    expect(stationIds).toContain(STATION_ALERTS.jetstream?.stationId)
    expect(stationIds).toContain(STATION_HANDLED_ALERTS.jetstream?.stationId)
    expect(RADIO_STATIONS[0]?.mounts.map((mount) => mount.id)).toEqual(["sw-ogg", "sw-mp3", "sw-wav"])
  })

  it("uses safe defaults and supports trimmed endpoint overrides", () => {
    for (const key of environmentKeys) delete process.env[key]
    expect(seasonalWeatherHandledAlertsUrl()).toBe("http://wx.lan.seasonalnet.org/v1/handled-alerts")
    expect(seasonalWeatherIcecastStatusUrl()).toBe("http://wx.lan.seasonalnet.org:8000/status-json.xsl")
    expect(seasonalWeatherNowPlayingUrl()).toBe("http://wx.lan.seasonalnet.org:7099/nowplaying")

    process.env.SEASONALWEATHER_API_BASE_URL = " https://weather.example.test/api/// "
    process.env.SEASONALWEATHER_ICECAST_STATUS_URL = " https://icecast.example.test/status/// "
    process.env.SEASONALWEATHER_NOWPLAYING_URL = " https://radio.example.test/now/// "
    expect(seasonalWeatherHandledAlertsUrl()).toBe("https://weather.example.test/api/v1/handled-alerts")
    expect(seasonalWeatherIcecastStatusUrl()).toBe("https://icecast.example.test/status")
    expect(seasonalWeatherNowPlayingUrl()).toBe("https://radio.example.test/now")
  })

  it("returns metadata configuration only for supported stations", () => {
    expect(getStationMetaServerCfg("seasonalweather")).toMatchObject({
      defaultArtist: "SeasonalNet",
      defaultArtworkUrl: "/apple-touch-icon.png",
    })
    expect(getStationMetaServerCfg("unknown")).toBeNull()
  })
})
