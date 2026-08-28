// src/lib/station-alert-config.ts
export type StationAlertConfig = {
  stationId: string
  serviceAreaName: string
  nwsAreas: string[]          // state/area codes for NWS query (DC, MD, VA, WV, PA)
  sameCodes: string[]         // 6-digit SAME/FIPS (incl marine SAME)
  radar: StationRadarConfig
}

export type RadarSourceId = "cloudgis" | "mrms"
export type RadarProductId = "reflectivity" | "velocity"

type RadarProductConfig = {
  label: string
  shortLabel: string
  tileUrlTemplate: string
  legend: string
  sourceLabel: string
}

type RadarSourceConfig = {
  label: string
  description: string
  products: Partial<Record<RadarProductId, RadarProductConfig>>
}

export type StationRadarConfig = {
  defaultSource: RadarSourceId
  defaultProduct: RadarProductId
  sources: Record<RadarSourceId, RadarSourceConfig>
}

const cloudGisWmsTile = (radarSite: string, layer: string) =>
  `https://opengeo.ncep.noaa.gov/geoserver/${radarSite.toLowerCase()}/wms?service=WMS&request=GetMap&version=1.3.0&layers=${radarSite.toLowerCase()}:${layer}&styles=&format=image/png&transparent=true&width=256&height=256&crs=EPSG:3857&bbox={bbox-epsg-3857}`

const mrmsReflectivityTile =
  "https://mapservices.weather.noaa.gov/eventdriven/rest/services/radar/radar_base_reflectivity_time/ImageServer/exportImage?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&f=image"

export const STATION_ALERTS: Record<string, StationAlertConfig> = {
  jetstream: {
    stationId: "jetstream",
    serviceAreaName: "Baltimore/Washington DC",
    nwsAreas: ["DC", "MD", "VA", "WV", "PA"],
    // Union of KEC83 + KHB36 + WXM42 + WXM43 from your config.yaml
    // Duplicates are fine; we de-dupe in code.
    // added two new FIPS marine locations as Jetstream now serves more marine locations. Please do not remove (this comment will be removed before commit)
    sameCodes: [
      // --- KEC83 ---
      "011001","024003","024005","024013","024025","024027","024029","024031","024033","024035","024037","024510",
      "051013","051059","051153","051510","042001","042133",

      // --- KHB36 ---
      "011001","024009","024017","024021","024031","024033","024037","054037",
      "051013","051043","051047","051059","051061","051099","051107","051113","051137","051139","051153","051157",
      "051177","051179","051187","051510","051600","051610","051630","051683","051685",
      "073535","073536","073537","073532","073533","073530","073531",

      // --- WXM42 ---
      "024001","024013","024021","024043","042001","042009","042055","042057",
      "054003","054023","054027","054031","054037","054057","054065","054071",
      "051015","051043","051061","051069","051091","051107","051139","051165","051171","051187",
      "051660","051790","051820","051840",

      // --- WXM43 ---
      "024001","024023","024043","042009","042057","042111","054023","054027","054031","054057","054065",
    ],
    radar: {
      defaultSource: "cloudgis",
      defaultProduct: "reflectivity",
      sources: {
        cloudgis: {
          label: "Local radar · KLWX",
          description: "Higher-detail single-radar products from the NWS CloudGIS service.",
          products: {
            reflectivity: {
              label: "Base reflectivity",
              shortLabel: "Reflectivity",
              tileUrlTemplate: cloudGisWmsTile("KLWX", "SR_BREF"),
              legend: "Reflectivity · dBZ",
              sourceLabel: "NWS CloudGIS · KLWX",
            },
            velocity: {
              label: "Base radial velocity",
              shortLabel: "Velocity",
              tileUrlTemplate: cloudGisWmsTile("KLWX", "SR_BVEL"),
              legend: "Radial velocity · toward / away from KLWX",
              sourceLabel: "NWS CloudGIS · KLWX",
            },
          },
        },
        mrms: {
          label: "Regional mosaic · MRMS",
          description: "Seamless regional reflectivity mosaic from NOAA MRMS.",
          products: {
            reflectivity: {
              label: "Base reflectivity mosaic",
              shortLabel: "Reflectivity",
              tileUrlTemplate: mrmsReflectivityTile,
              legend: "Reflectivity mosaic · dBZ",
              sourceLabel: "NOAA MRMS",
            },
          },
        },
      },
    },
  },
}
