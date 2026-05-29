export type JsonObject = Record<string, unknown>

export type OpenApiDocumentOptions = {
  title: string
  version?: string
  description?: string
  paths: JsonObject
  tags?: Array<{ name: string; description?: string }>
  servers?: Array<{ url: string; description?: string }>
  schemas?: JsonObject
}

export const problemDetailsSchema = {
  type: "object",
  additionalProperties: true,
  required: ["type", "title", "status"],
  properties: {
    type: {
      type: "string",
      format: "uri-reference",
      description: "Problem type URI or URI-reference.",
    },
    title: { type: "string" },
    status: { type: "integer", minimum: 100, maximum: 599 },
    detail: { type: "string" },
    instance: { type: "string", format: "uri-reference" },
    error: {
      type: "string",
      description: "Temporary compatibility extension for older SPA callers.",
    },
  },
} satisfies JsonObject

export const apiMetaSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    apiVersion: { type: "string" },
    servedAt: { type: "string", format: "date-time" },
    requestId: { type: "string" },
    count: { type: "integer", minimum: 0 },
  },
} satisfies JsonObject

export const apiLinksSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    self: { type: "string" },
    next: { type: "string" },
  },
} satisfies JsonObject

export const siteAnnouncementSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "title", "body"],
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    body: { type: "string" },
    level: { type: "string", enum: ["info", "success", "warning", "critical"] },
    href: { type: ["string", "null"] },
    hrefLabel: { type: ["string", "null"] },
    enabled: { type: "boolean" },
    startsAt: { type: ["string", "null"], format: "date-time" },
    endsAt: { type: ["string", "null"], format: "date-time" },
    sites: { type: "array", items: { type: "string" } },
  },
} satisfies JsonObject

export const siteAnnouncementCollectionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    data: {
      type: "array",
      items: { $ref: "#/components/schemas/SiteAnnouncement" },
    },
    meta: { $ref: "#/components/schemas/ApiMeta" },
    links: { $ref: "#/components/schemas/ApiLinks" },
  },
} satisfies JsonObject

export const standardProblemResponses = {
  "400": { $ref: "#/components/responses/BadRequest" },
  "401": { $ref: "#/components/responses/Unauthorized" },
  "403": { $ref: "#/components/responses/Forbidden" },
  "404": { $ref: "#/components/responses/NotFound" },
  "500": { $ref: "#/components/responses/InternalServerError" },
  "502": { $ref: "#/components/responses/BadGateway" },
} satisfies JsonObject

function problemResponse(description: string) {
  return {
    description,
    content: {
      "application/problem+json": {
        schema: { $ref: "#/components/schemas/ProblemDetails" },
      },
    },
  }
}

export function jsonResponse(description: string, schema: JsonObject) {
  return {
    description,
    content: {
      "application/json": {
        schema,
      },
    },
  }
}

export function openApiDocument(options: OpenApiDocumentOptions) {
  return {
    openapi: "3.1.0",
    jsonSchemaDialect: "https://json-schema.org/draft/2020-12/schema",
    info: {
      title: options.title,
      version: options.version || "0.1.0",
      ...(options.description ? { description: options.description } : {}),
    },
    servers: options.servers || [{ url: "/", description: "Current origin" }],
    tags: options.tags || [],
    paths: options.paths,
    components: {
      schemas: {
        ProblemDetails: problemDetailsSchema,
        ApiMeta: apiMetaSchema,
        ApiLinks: apiLinksSchema,
        SiteAnnouncement: siteAnnouncementSchema,
        SiteAnnouncementCollection: siteAnnouncementCollectionSchema,
        ...(options.schemas || {}),
      },
      responses: {
        BadRequest: problemResponse("Bad request."),
        Unauthorized: problemResponse("Authentication is required."),
        Forbidden: problemResponse("The authenticated user is not allowed to access this resource."),
        NotFound: problemResponse("The requested resource was not found."),
        InternalServerError: problemResponse("The server failed while handling the request."),
        BadGateway: problemResponse("The upstream service failed or was unreachable."),
      },
    },
  }
}

export function openApiJson(document: JsonObject) {
  return new Response(JSON.stringify(document), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/vnd.oai.openapi+json;version=3.1.0; charset=utf-8",
    },
  })
}

export function announcementsPath(summary = "List site announcements") {
  return {
    get: {
      tags: ["announcements"],
      summary,
      responses: {
        "200": jsonResponse("Announcement collection.", {
          $ref: "#/components/schemas/SiteAnnouncementCollection",
        }),
        "500": { $ref: "#/components/responses/InternalServerError" },
      },
    },
  }
}
