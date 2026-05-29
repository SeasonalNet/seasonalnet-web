import { announcementsPath, jsonResponse, openApiDocument, openApiJson } from "@seasonalnet/shell/src/lib/server/openapi"

export const runtime = "nodejs"

const pbxMetricsSchema = {
  type: "object",
  additionalProperties: true,
  required: ["enabled", "generatedAt"],
  properties: {
    enabled: { type: "boolean" },
    generatedAt: { type: "string", format: "date-time" },
    extensionCount: { type: ["integer", "null"], minimum: 0 },
    callsToday: { type: ["integer", "null"], minimum: 0 },
    callsThisMonth: { type: ["integer", "null"], minimum: 0 },
    totalCalls: { type: ["integer", "null"], minimum: 0 },
    warning: { type: "string" },
    error: { type: "string" },
  },
}

const document = openApiDocument({
  title: "SeasonalPBX SPA API",
  description: "Browser-facing API surface for the SeasonalPBX SPA.",
  tags: [
    { name: "announcements", description: "Site announcement feed." },
    { name: "pbx", description: "PBX status and metrics." },
  ],
  schemas: {
    PbxMetrics: pbxMetricsSchema,
  },
  paths: {
    "/api/announcements": announcementsPath(),
    "/api/pbx/metrics": {
      get: {
        tags: ["pbx"],
        summary: "Return lightweight FreePBX metrics for the SPA.",
        responses: {
          "200": jsonResponse("PBX metrics payload.", { $ref: "#/components/schemas/PbxMetrics" }),
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
