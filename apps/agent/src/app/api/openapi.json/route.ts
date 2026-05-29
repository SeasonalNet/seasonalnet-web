import {
  jsonResponse,
  openApiDocument,
  openApiJson,
} from "@seasonalnet/shell/src/lib/server/openapi"

export const runtime = "nodejs"

const genericJsonSchema = {
  type: "object",
  additionalProperties: true,
}

const sessionIdParameter = {
  name: "sessionId",
  in: "path",
  required: true,
  schema: { type: "string" },
}

const turnIdParameter = {
  name: "turnId",
  in: "path",
  required: true,
  schema: { type: "string" },
}

const sessionIdQueryParameter = {
  name: "session_id",
  in: "query",
  required: true,
  schema: { type: "string" },
}

const limitParameter = {
  name: "limit",
  in: "query",
  required: false,
  schema: { type: "integer", minimum: 1, maximum: 500 },
}

const document = openApiDocument({
  title: "Seasonal Agent SPA API",
  description: "Browser-facing Seasonal Agent API proxy. Routes require an authorized UI session and proxy to the trusted local Seasonal Agent backend.",
  tags: [
    { name: "agent", description: "Agent chat, session, turn, and tool proxy routes." },
  ],
  schemas: {
    AgentPayload: genericJsonSchema,
    AgentHealth: {
      type: "object",
      additionalProperties: false,
      required: ["ok", "status"],
      properties: {
        ok: { type: "boolean" },
        status: { type: "integer" },
      },
    },
  },
  paths: {
    "/api/agent/health": {
      get: {
        tags: ["agent"],
        summary: "Return proxied Seasonal Agent health state.",
        responses: {
          "200": jsonResponse("Agent health state.", { $ref: "#/components/schemas/AgentHealth" }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "500": { $ref: "#/components/responses/InternalServerError" },
          "502": { $ref: "#/components/responses/BadGateway" },
        },
      },
    },
    "/api/agent/tools": {
      get: {
        tags: ["agent"],
        summary: "Return available agent tool metadata.",
        responses: {
          "200": jsonResponse("Tool metadata.", { $ref: "#/components/schemas/AgentPayload" }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/agent/chat": {
      post: {
        tags: ["agent"],
        summary: "Create a trusted agent chat turn.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/AgentPayload" } } },
        },
        responses: {
          "200": jsonResponse("Agent turn response.", { $ref: "#/components/schemas/AgentPayload" }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/agent/chat/stream": {
      post: {
        tags: ["agent"],
        summary: "Create a trusted streaming agent chat turn.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/AgentPayload" } } },
        },
        responses: {
          "200": {
            description: "Server-sent event stream.",
            content: { "text/event-stream": { schema: { type: "string" } } },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "500": { $ref: "#/components/responses/InternalServerError" },
          "502": { $ref: "#/components/responses/BadGateway" },
        },
      },
    },
    "/api/agent/sessions": {
      get: {
        tags: ["agent"],
        summary: "List sessions owned by the authorized UI user.",
        parameters: [limitParameter],
        responses: {
          "200": jsonResponse("Session collection.", { $ref: "#/components/schemas/AgentPayload" }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/agent/sessions/{sessionId}": {
      get: {
        tags: ["agent"],
        summary: "Return messages for a session owned by the authorized UI user.",
        parameters: [sessionIdParameter, limitParameter],
        responses: {
          "200": jsonResponse("Session detail payload.", { $ref: "#/components/schemas/AgentPayload" }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/agent/sessions/{sessionId}/active-turn": {
      get: {
        tags: ["agent"],
        summary: "Return the active turn for a session, if any.",
        parameters: [sessionIdParameter],
        responses: {
          "200": jsonResponse("Active turn payload.", { $ref: "#/components/schemas/AgentPayload" }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/agent/sessions/{sessionId}/recoverable-turn": {
      get: {
        tags: ["agent"],
        summary: "Return recoverable turn metadata for a session, if any.",
        parameters: [sessionIdParameter],
        responses: {
          "200": jsonResponse("Recoverable turn payload.", { $ref: "#/components/schemas/AgentPayload" }),
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/agent/turns/{turnId}/snapshot": {
      get: {
        tags: ["agent"],
        summary: "Return a durable turn snapshot.",
        parameters: [turnIdParameter, sessionIdQueryParameter],
        responses: {
          "200": jsonResponse("Turn snapshot payload.", { $ref: "#/components/schemas/AgentPayload" }),
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/agent/turns/{turnId}/events": {
      get: {
        tags: ["agent"],
        summary: "Return missed turn events after a sequence number.",
        parameters: [
          turnIdParameter,
          sessionIdQueryParameter,
          { name: "after_sequence", in: "query", required: false, schema: { type: "integer", minimum: 0 } },
        ],
        responses: {
          "200": jsonResponse("Turn event payload.", { $ref: "#/components/schemas/AgentPayload" }),
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/agent/turns/{turnId}/cancel": {
      post: {
        tags: ["agent"],
        summary: "Cancel an active turn.",
        parameters: [turnIdParameter, sessionIdQueryParameter],
        responses: {
          "200": jsonResponse("Cancel result payload.", { $ref: "#/components/schemas/AgentPayload" }),
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "500": { $ref: "#/components/responses/InternalServerError" },
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
