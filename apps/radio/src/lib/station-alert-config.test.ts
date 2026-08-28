import { describe, expect, it } from "vitest"

import { STATION_ALERTS } from "./station-alert-config"

describe("Jetstream radar configuration", () => {
  it("keeps local velocity available while MRMS remains reflectivity-only", () => {
    const radar = STATION_ALERTS.jetstream.radar

    expect(radar.defaultSource).toBe("cloudgis")
    expect(radar.sources.cloudgis.products.reflectivity?.sourceLabel).toContain("KLWX")
    expect(radar.sources.cloudgis.products.velocity?.tileUrlTemplate).toContain("SR_BVEL")
    expect(radar.sources.mrms.products.reflectivity?.sourceLabel).toBe("NOAA MRMS")
    expect(radar.sources.mrms.products.velocity).toBeUndefined()
  })
})
