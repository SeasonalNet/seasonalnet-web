import { describe, expect, it } from "vitest"

import {
  capPolygonStyle,
  assembleAlertProductText,
  countyFillStyle,
  deriveAlertSeverity,
  expandFipsCode,
  fipsFromAlert,
  fipsFromCoverageRef,
  marineZonesFromAlert,
  overlappingCountyStyle,
  sameCodesIntersectServiceArea,
  sameToCoverageRef,
  sameToFips,
  sameToMarineZone,
  toLeafletStyle,
  type NwsAlertFeature,
} from "./alert-map-utils"

function alertWithSame(same: string[]): NwsAlertFeature {
  return {
    id: "alert-1",
    type: "Feature",
    geometry: null,
    properties: {
      id: "alert-1",
      event: "Test",
      severity: "Unknown",
      urgency: "Unknown",
      certainty: "Unknown",
      headline: null,
      description: null,
      areaDesc: "Test area",
      effective: "2026-08-23T00:00:00Z",
      expires: "2026-08-23T01:00:00Z",
      senderName: "Test",
      status: "Actual",
      messageType: "Alert",
      parameters: { SAME: same },
    },
  }
}

describe("alert severity", () => {
  it.each([
    ["Tornado Watch", "Extreme", "Moderate"],
    ["Unlisted event", "Severe", "Severe"],
    ["Tornado Warning", "Unknown", "Extreme"],
    ["Future Ice Warning", undefined, "Severe"],
    ["Future Flood Watch", undefined, "Moderate"],
    ["Future Wind Advisory", undefined, "Minor"],
    ["Future Weather Statement", undefined, "Minor"],
    ["Required Weekly Test", undefined, "Unknown"],
    [undefined, "Bogus", "Unknown"],
  ] as const)("derives %s / %s as %s", (event, severity, expected) => {
    expect(deriveAlertSeverity(event, severity)).toBe(expected)
  })

  it("produces stable CAP, county, overlap, and Leaflet styles", () => {
    expect(capPolygonStyle("Extreme")).toMatchObject({ fillColor: "#ff1744", fillOpacity: 0.18, weight: 3 })
    expect(countyFillStyle("Severe")).toMatchObject({ fillColor: "#ff6d00", fillOpacity: 0.35, weight: 1.5 })
    expect(countyFillStyle("unsupported")).toMatchObject({ fillColor: "#b0bec5" })
    const overlap = overlappingCountyStyle("Minor")
    expect(overlap).toMatchObject({ fillOpacity: 0, weight: 2.5, dashArray: "6 4" })
    expect(toLeafletStyle(overlap)).toMatchObject({ ...overlap, opacity: 0.9 })
  })
})

describe("CAP product text", () => {
  it("uses NWSHeadline before the generic headline and appends the product text", () => {
    expect(assembleAlertProductText({
      nwsHeadline: "NWS operational headline",
      headline: "Generic API headline",
      description: "Description.",
      instruction: "Take action.",
    })).toBe("NWS operational headline\n\nDescription.\n\nTake action.")
  })

  it("falls back to the generic headline when NWSHeadline is absent", () => {
    expect(assembleAlertProductText({ headline: "Fallback", description: "Details" })).toBe("Fallback\n\nDetails")
  })

  it("returns no text when every CAP text field is empty", () => {
    expect(assembleAlertProductText({ nwsHeadline: " ", headline: "", description: "", instruction: null })).toBe("")
  })
})

describe("SAME and service-area coverage", () => {
  it.each([
    ["027053", { kind: "fips", id: "27053" }],
    ["027000", { kind: "state", id: "27" }],
    ["073535", { kind: "marineZone", id: "ANZ535" }],
    ["000000", null],
    ["bad", null],
    ["127053", null],
  ] as const)("maps %s", (same, expected) => {
    expect(sameToCoverageRef(same)).toEqual(expected)
  })

  it("exposes only the matching land or marine projection", () => {
    expect(sameToFips("027053")).toBe("27053")
    expect(sameToFips("073535")).toBeNull()
    expect(sameToMarineZone("073535")).toBe("ANZ535")
    expect(sameToMarineZone("027053")).toBeNull()
  })

  it("expands state coverage only within the supplied service area", () => {
    const available = ["27053", "27123", "55001", "00000", "bad", "27053"]
    expect(fipsFromCoverageRef({ kind: "fips", id: "27053" }, available)).toEqual(["27053"])
    expect(fipsFromCoverageRef({ kind: "state", id: "27" }, available)).toEqual(["27053", "27123"])
    expect(fipsFromCoverageRef({ kind: "marineZone", id: "ANZ535" }, available)).toEqual([])
    expect(fipsFromCoverageRef(null, available)).toEqual([])
    expect(expandFipsCode("27000", available)).toEqual(["27053", "27123"])
    expect(expandFipsCode("27053", available)).toEqual(["27053"])
    expect(expandFipsCode("00000", available)).toEqual([])
    expect(expandFipsCode("bad", available)).toEqual([])
  })

  it("matches exact and statewide SAME codes without treating national coverage as local", () => {
    const serviceArea = ["027053", "027123", "055001"]
    expect(sameCodesIntersectServiceArea(["027053"], serviceArea)).toBe(true)
    expect(sameCodesIntersectServiceArea(["027000"], serviceArea)).toBe(true)
    expect(sameCodesIntersectServiceArea(["055000"], serviceArea)).toBe(true)
    expect(sameCodesIntersectServiceArea(["006000"], serviceArea)).toBe(false)
    expect(sameCodesIntersectServiceArea(["000000", "bad"], serviceArea)).toBe(false)
    expect(sameCodesIntersectServiceArea(undefined, serviceArea)).toBe(false)
  })

  it("extracts unique county coverage and marine zones from alerts", () => {
    const alert = alertWithSame(["027053", "027053", "027000", "073535", "bad"])
    expect(fipsFromAlert(alert, ["27053", "27123", "55001"])).toEqual(["27053", "27123"])
    expect(marineZonesFromAlert(alert)).toEqual(["ANZ535"])
    expect(fipsFromAlert({ ...alert, properties: { ...alert.properties, parameters: undefined } })).toEqual([])
  })
})
