import {
  announcementsPath,
  jsonResponse,
  openApiDocument,
  openApiJson,
} from "@seasonalnet/shell/src/lib/server/openapi"

export const runtime = "nodejs"

const moduleOverviewSchema = {
  type: "object",
  additionalProperties: true,
  required: ["configured", "reachable"],
  properties: {
    configured: { type: "boolean" },
    reachable: { type: "boolean" },
    error: { type: "string" },
  },
}

const moduleParameter = {
  name: "module",
  in: "path",
  required: true,
  schema: {
    type: "string",
    enum: ["seasonalweather", "seasonalprovisioning", "seasonalapid", "seasonalpbx", "seasonalradio"],
  },
}

const insertIdParameter = {
  name: "insert_id",
  in: "path",
  required: true,
  schema: {
    type: "string",
    pattern: "^[A-Za-z0-9_-]+$",
  },
}

function seasonalWeatherActionPath(summary: string) {
  return {
    post: {
      tags: ["seasonalweather"],
      summary,
      responses: {
        "200": jsonResponse("Upstream action result.", { $ref: "#/components/schemas/ActionResult" }),
        "400": { $ref: "#/components/responses/BadRequest" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "404": { $ref: "#/components/responses/NotFound" },
        "409": {
          description: "Conflict with the upstream SeasonalWeather command/idempotency state.",
          content: {
            "application/problem+json": {
              schema: { $ref: "#/components/schemas/ProblemDetails" },
            },
          },
        },
        "422": { $ref: "#/components/responses/BadRequest" },
        "500": { $ref: "#/components/responses/InternalServerError" },
        "502": { $ref: "#/components/responses/BadGateway" },
      },
    },
  }
}

function seasonalWeatherDeleteActionPath(summary: string) {
  return {
    delete: {
      tags: ["seasonalweather"],
      summary,
      responses: {
        "200": jsonResponse("Upstream action result.", { $ref: "#/components/schemas/ActionResult" }),
        "400": { $ref: "#/components/responses/BadRequest" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "404": { $ref: "#/components/responses/NotFound" },
        "409": {
          description: "Conflict with the upstream SeasonalWeather command/idempotency state.",
          content: {
            "application/problem+json": {
              schema: { $ref: "#/components/schemas/ProblemDetails" },
            },
          },
        },
        "422": { $ref: "#/components/responses/BadRequest" },
        "500": { $ref: "#/components/responses/InternalServerError" },
        "502": { $ref: "#/components/responses/BadGateway" },
      },
    },
  }
}

function seasonalWeatherGetPath(summary: string) {
  return {
    get: {
      tags: ["seasonalweather"],
      summary,
      responses: {
        "200": jsonResponse("Upstream SeasonalWeather result.", { $ref: "#/components/schemas/ActionResult" }),
        "400": { $ref: "#/components/responses/BadRequest" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "404": { $ref: "#/components/responses/NotFound" },
        "422": { $ref: "#/components/responses/BadRequest" },
        "500": { $ref: "#/components/responses/InternalServerError" },
        "502": { $ref: "#/components/responses/BadGateway" },
      },
    },
  }
}


const actionResultSchema = {
  type: "object",
  additionalProperties: true,
}

const document = openApiDocument({
  title: "SeasonalNet Admin SPA API",
  description: "Browser-facing admin/control-plane API surface. Mutating routes proxy to backend services with app-side authorization and idempotency behavior.",
  tags: [
    { name: "announcements", description: "Site announcement feed." },
    { name: "modules", description: "Admin module overviews." },
    { name: "seasonalweather", description: "SeasonalWeather proxied operations." },
  ],
  schemas: {
    ModuleOverview: moduleOverviewSchema,
    ActionResult: actionResultSchema,
  },
  paths: {
    "/api/announcements": announcementsPath(),
    "/api/modules/{module}/overview": {
      get: {
        tags: ["modules"],
        summary: "Return an admin module overview.",
        parameters: [moduleParameter],
        responses: {
          "200": jsonResponse("Module overview payload.", { $ref: "#/components/schemas/ModuleOverview" }),
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalServerError" },
          "502": { $ref: "#/components/responses/BadGateway" },
        },
      },
    },
    "/api/modules/seasonalweather/cycle/rebuild": seasonalWeatherActionPath("Rebuild the SeasonalWeather station cycle."),
    "/api/modules/seasonalweather/mode/heightened": seasonalWeatherActionPath("Set SeasonalWeather heightened mode."),
    "/api/modules/seasonalweather/mode/heightened/clear": seasonalWeatherDeleteActionPath("Clear SeasonalWeather heightened mode."),
    "/api/modules/seasonalweather/tests/originate": seasonalWeatherActionPath("Originate a SeasonalWeather test."),
    "/api/modules/seasonalweather/uploads/audio": seasonalWeatherActionPath("Upload SeasonalWeather audio."),
    "/api/modules/seasonalweather/originate/text": seasonalWeatherActionPath("Originate SeasonalWeather text."),
    "/api/modules/seasonalweather/originate/audio": seasonalWeatherActionPath("Originate SeasonalWeather audio."),
    "/api/modules/seasonalweather/inserts": seasonalWeatherGetPath("List SeasonalWeather cycle inserts."),
    "/api/modules/seasonalweather/inserts/text": seasonalWeatherActionPath("Schedule a SeasonalWeather text cycle insert."),
    "/api/modules/seasonalweather/inserts/audio": seasonalWeatherActionPath("Schedule a SeasonalWeather audio cycle insert."),
    "/api/modules/seasonalweather/inserts/{insert_id}": {
      ...seasonalWeatherGetPath("Return one SeasonalWeather cycle insert."),
      ...seasonalWeatherDeleteActionPath("Cancel a SeasonalWeather cycle insert."),
      parameters: [insertIdParameter],
    },
    "/api/modules/seasonalweather/config/reload": seasonalWeatherActionPath("Reload SeasonalWeather configuration."),
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
