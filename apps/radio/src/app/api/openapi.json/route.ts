import {
  announcementsPath,
  jsonResponse,
  openApiDocument,
  openApiJson,
} from "@seasonalnet/shell/src/lib/server/openapi"

export const runtime = "nodejs"

const stationAlertSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "event", "headline", "severity", "urgency", "certainty", "area", "sameCodes", "ugcCodes", "links"],
  properties: {
    id: { type: "string" },
    event: { type: "string" },
    headline: { type: "string" },
    severity: { type: "string" },
    urgency: { type: "string" },
    certainty: { type: "string" },
    area: { type: "string" },
    effective: { type: ["string", "null"], format: "date-time" },
    ends: { type: ["string", "null"], format: "date-time" },
    expires: { type: ["string", "null"], format: "date-time" },
    sent: { type: ["string", "null"], format: "date-time" },
    sameCodes: { type: "array", items: { type: "string" } },
    ugcCodes: { type: "array", items: { type: "string" } },
    geometry: { type: ["object", "null"], additionalProperties: true },
    links: {
      type: "object",
      additionalProperties: false,
      properties: { nws: { type: "string" } },
    },
  },
}

const stationAlertCollectionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["stationId", "serviceAreaName", "generatedAt", "source", "alerts"],
  properties: {
    stationId: { type: "string" },
    serviceAreaName: { type: "string" },
    generatedAt: { type: "string", format: "date-time" },
    source: { type: "string", enum: ["nws"] },
    alerts: { type: "array", items: { $ref: "#/components/schemas/StationAlert" } },
  },
}

const handledAlertSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "event", "headline", "severity", "urgency", "certainty", "area", "effective", "ends", "expires", "sent", "sameCodes", "source", "from"],
  properties: {
    id: { type: "string" },
    event: { type: "string" },
    headline: { type: "string" },
    severity: { type: "string" },
    urgency: { type: "string" },
    certainty: { type: "string" },
    area: { type: "string" },
    effective: { type: ["string", "null"], format: "date-time" },
    ends: { type: ["string", "null"], format: "date-time" },
    expires: { type: ["string", "null"], format: "date-time" },
    sent: { type: ["string", "null"], format: "date-time" },
    sameCodes: { type: "array", items: { type: "string" } },
    source: { type: ["string", "null"] },
    from: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        kind: { type: "string", enum: ["relay", "origin", "unknown"] },
      },
    },
    links: {
      type: "object",
      additionalProperties: false,
      properties: {
        primary: { type: "string" },
        nws: { type: "string" },
      },
    },
  },
}

const handledAlertCollectionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ok", "enabled", "stationId", "source", "generatedAt", "alerts"],
  properties: {
    ok: { type: "boolean" },
    enabled: { type: "boolean" },
    stationId: { type: "string" },
    source: { type: "string" },
    generatedAt: { type: "string", format: "date-time" },
    error: { type: "string" },
    upstreamProblemType: { type: "string" },
    upstreamCode: { type: "string" },
    upstreamRequestId: { type: "string" },
    alerts: { type: "array", items: { $ref: "#/components/schemas/HandledAlert" } },
  },
}

const stationMetadataSchema = {
  type: "object",
  additionalProperties: true,
  required: ["title", "artist", "album", "artworkUrl", "updatedAt", "mount"],
  properties: {
    title: { type: "string" },
    artist: { type: "string" },
    album: { type: "string" },
    artworkUrl: { type: "string" },
    updatedAt: { type: "string", format: "date-time" },
    mount: { type: ["string", "null"] },
    sw_kind: { type: ["string", "null"] },
    sw_cycle_key: { type: ["string", "null"] },
    sw_mode: { type: ["string", "null"] },
  },
}

const stationIdParameter = {
  name: "stationId",
  in: "path",
  required: true,
  schema: { type: "string" },
}

const document = openApiDocument({
  title: "SeasonalRadio SPA API",
  description: "Browser-facing API surface for the SeasonalRadio SPA.",
  tags: [
    { name: "announcements", description: "Site announcement feed." },
    { name: "stations", description: "Radio station alert and metadata feeds." },
  ],
  schemas: {
    StationAlert: stationAlertSchema,
    StationAlertCollection: stationAlertCollectionSchema,
    HandledAlert: handledAlertSchema,
    HandledAlertCollection: handledAlertCollectionSchema,
    StationMetadata: stationMetadataSchema,
  },
  paths: {
    "/api/announcements": announcementsPath(),
    "/api/stations/{stationId}/alerts": {
      get: {
        tags: ["stations"],
        summary: "Return active NWS alerts relevant to a station service area.",
        parameters: [stationIdParameter],
        responses: {
          "200": jsonResponse("Station active alert collection.", { $ref: "#/components/schemas/StationAlertCollection" }),
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/stations/{stationId}/handled-alerts": {
      get: {
        tags: ["stations"],
        summary: "Return recently handled station-feed alerts.",
        parameters: [stationIdParameter],
        responses: {
          "200": jsonResponse("Handled alert collection.", { $ref: "#/components/schemas/HandledAlertCollection" }),
        },
      },
    },
    "/api/stations/{stationId}/metadata": {
      get: {
        tags: ["stations"],
        summary: "Return current station metadata and now-playing information.",
        parameters: [
          stationIdParameter,
          { name: "mount", in: "query", required: false, schema: { type: "string" } },
        ],
        responses: {
          "200": jsonResponse("Station metadata.", { $ref: "#/components/schemas/StationMetadata" }),
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/openapi.json": {
      get: {
        tags: ["metadata"],
        summary: "Return this OpenAPI document.",
        responses: {
          "200": jsonResponse("OpenAPI document.", { type: "object" }),
        },
      },
    },
  },
})


export async function GET() {
  return openApiJson(document)
}
