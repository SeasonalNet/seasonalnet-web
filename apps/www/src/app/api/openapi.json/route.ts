import { announcementsPath, openApiDocument, openApiJson } from "@seasonalnet/shell/src/lib/server/openapi"

export const runtime = "nodejs"

const document = openApiDocument({
  title: "SeasonalNet WWW SPA API",
  description: "Browser-facing API surface for the SeasonalNet WWW SPA.",
  tags: [{ name: "announcements", description: "Site announcement feed." }],
  paths: {
    "/api/announcements": announcementsPath(),
    "/api/openapi.json": {
      get: {
        tags: ["metadata"],
        summary: "Return this OpenAPI document.",
        responses: {
          "200": {
            description: "OpenAPI document.",
            content: {
              "application/vnd.oai.openapi+json": {
                schema: { type: "object" },
              },
            },
          },
        },
      },
    },
  },
})

export async function GET() {
  return openApiJson(document)
}
