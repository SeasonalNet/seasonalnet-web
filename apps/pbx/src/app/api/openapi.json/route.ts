import { announcementsPath, jsonResponse, openApiDocument, openApiJson } from "@seasonalnet/shell/src/lib/server/openapi"

export const runtime = "nodejs"

const problemSchema = {
  type: "object",
  additionalProperties: true,
  required: ["title", "status"],
  properties: {
    type: { type: "string" },
    title: { type: "string" },
    status: { type: "integer" },
    detail: { type: "string" },
  },
}

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

const extensionOwnerSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "discordId", "extension", "state", "displayName", "voicemailEmailMarker", "createdAt", "updatedAt"],
  properties: {
    id: { type: "integer" },
    discordId: { type: "string" },
    extension: { type: "string" },
    state: { type: "string" },
    displayName: { type: ["string", "null"] },
    voicemailEmailMarker: { type: ["string", "null"] },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
}

const extensionCredentialsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["sipSecret", "voicemailPin"],
  properties: {
    sipSecret: { type: "string" },
    voicemailPin: { type: "string" },
  },
}

const operationSchema = {
  type: "object",
  additionalProperties: true,
  required: ["id", "operation", "status", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string" },
    operation: { type: "string" },
    status: { type: "string" },
    extension: { type: ["string", "null"] },
    discordId: { type: ["string", "null"] },
    error: { type: ["string", "null"] },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    completedAt: { type: ["string", "null"], format: "date-time" },
  },
}

const pbxSelfSchema = {
  type: "object",
  additionalProperties: false,
  required: ["user", "owner", "poolSummary", "operations"],
  properties: {
    user: {
      type: "object",
      additionalProperties: false,
      required: ["displayName", "email", "discordId"],
      properties: {
        displayName: { type: "string" },
        email: { type: ["string", "null"] },
        discordId: { type: "string" },
      },
    },
    owner: { anyOf: [extensionOwnerSchema, { type: "null" }] },
    poolSummary: {
      anyOf: [
        {
          type: "object",
          additionalProperties: true,
          required: ["total", "enabled", "available", "byState"],
          properties: {
            total: { type: "integer", minimum: 0 },
            enabled: { type: "integer", minimum: 0 },
            available: { type: "integer", minimum: 0 },
            byState: { type: "object", additionalProperties: { type: "integer" } },
          },
        },
        { type: "null" },
      ],
    },
    operations: { type: "array", items: operationSchema },
  },
}

const mutationSchema = {
  type: "object",
  additionalProperties: true,
  required: ["owner", "replayed"],
  properties: {
    owner: { anyOf: [extensionOwnerSchema, { type: "null" }] },
    replayed: { type: "boolean" },
    credentials: { anyOf: [extensionCredentialsSchema, { type: "null" }] },
  },
}

const problemResponses = {
  "401": jsonResponse("Unauthorized.", problemSchema),
  "409": jsonResponse("Session or extension state conflict.", problemSchema),
  "500": jsonResponse("Server error.", problemSchema),
  "503": jsonResponse("PBX control backend unavailable or unconfigured.", problemSchema),
}

const document = openApiDocument({
  title: "SeasonalPBX SPA API",
  description: "Browser-facing API surface for the SeasonalPBX SPA.",
  tags: [
    { name: "announcements", description: "Site announcement feed." },
    { name: "pbx", description: "PBX status, metrics, and self-service dashboard." },
  ],
  schemas: {
    Problem: problemSchema,
    PbxMetrics: pbxMetricsSchema,
    PbxSelf: pbxSelfSchema,
    PbxMutation: mutationSchema,
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
    "/api/pbx/self": {
      get: {
        tags: ["pbx"],
        summary: "Return the signed-in user's PBX dashboard state.",
        responses: {
          "200": jsonResponse("PBX self-service dashboard payload.", { $ref: "#/components/schemas/PbxSelf" }),
          ...problemResponses,
        },
      },
    },
    "/api/pbx/self/claim": {
      post: {
        tags: ["pbx"],
        summary: "Claim a managed extension for the signed-in user.",
        responses: {
          "202": jsonResponse("PBX claim mutation payload.", { $ref: "#/components/schemas/PbxMutation" }),
          ...problemResponses,
        },
      },
    },
    "/api/pbx/self/credentials/reveal": {
      post: {
        tags: ["pbx"],
        summary: "Reveal current SIP credentials for the signed-in user's extension.",
        responses: {
          "200": jsonResponse("Credential reveal payload.", { $ref: "#/components/schemas/PbxMutation" }),
          ...problemResponses,
        },
      },
    },
    "/api/pbx/self/credentials/rotate": {
      post: {
        tags: ["pbx"],
        summary: "Rotate SIP credentials for the signed-in user's extension.",
        responses: {
          "202": jsonResponse("Credential rotation payload.", { $ref: "#/components/schemas/PbxMutation" }),
          ...problemResponses,
        },
      },
    },
    "/api/pbx/self/operations": {
      get: {
        tags: ["pbx"],
        summary: "Return recent pbx-controld operations for the signed-in user.",
        responses: {
          "200": jsonResponse("Recent operations.", {
            type: "object",
            additionalProperties: false,
            required: ["operations"],
            properties: { operations: { type: "array", items: operationSchema } },
          }),
          ...problemResponses,
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
