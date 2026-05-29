import { NextRequest, NextResponse } from "next/server"
import { problemDetailFromError, problemJson } from "@seasonalnet/shell/src/lib/server/problem"

import {
  SeasonalWeatherApiError,
  seasonalWeatherApi,
  type SeasonalWeatherCapability,
} from "@/lib/server/modules/seasonalweather-api"

type RouteDef = {
  upstreamPath: string
  capability: SeasonalWeatherCapability
  methods: Array<"POST" | "DELETE">
  forwardJsonBody?: boolean
  forwardFormData?: boolean
  defaultBody?: unknown
}

const ROUTES: Record<string, RouteDef> = {
  "cycle/rebuild": {
    upstreamPath: "/v1/cycle/rebuild",
    capability: "control",
    methods: ["POST"],
    defaultBody: {
      reason: "Admin UI rebuild cycle",
    },
  },
  "mode/heightened": {
    upstreamPath: "/v1/mode/heightened",
    capability: "control",
    methods: ["POST"],
    forwardJsonBody: true,
  },
  "mode/heightened/clear": {
    upstreamPath: "/v1/mode/heightened",
    capability: "control",
    methods: ["DELETE"],
    defaultBody: {
      reason: "Admin UI clear heightened mode",
    },
  },
  "tests/originate": {
    upstreamPath: "/v1/tests/originate",
    capability: "control",
    methods: ["POST"],
    forwardJsonBody: true,
  },
  "uploads/audio": {
    upstreamPath: "/v1/uploads/audio",
    capability: "originate",
    methods: ["POST"],
    forwardFormData: true,
  },
  "originate/text": {
    upstreamPath: "/v1/originate/text",
    capability: "originate",
    methods: ["POST"],
    forwardJsonBody: true,
  },
  "originate/audio": {
    upstreamPath: "/v1/originate/audio",
    capability: "originate",
    methods: ["POST"],
    forwardJsonBody: true,
  },
  "config/reload": {
    upstreamPath: "/v1/config/reload",
    capability: "config",
    methods: ["POST"],
    defaultBody: {
      reason: "Admin UI reload config",
    },
  },
}

async function handle(
  req: NextRequest,
  paramsPromise: Promise<{ path: string[] }>
) {
  const { path } = await paramsPromise
  const key = path.join("/")
  const def = ROUTES[key]

  if (!def || !def.methods.includes(req.method as "POST" | "DELETE")) {
    return problemJson({
      type: "/problems/not-found",
      title: "Not found",
      status: 404,
      detail: "No supported SeasonalWeather operation matches this route and method.",
    })
  }

  try {
    let body: BodyInit | undefined
    let headers: HeadersInit | undefined

    if (def.forwardFormData) {
      body = await req.formData()
    } else if (def.forwardJsonBody) {
      const raw = await req.text()
      body = raw
      headers = {
        "Content-Type": req.headers.get("content-type") || "application/json",
      }
    } else if (def.defaultBody !== undefined) {
      body = JSON.stringify(def.defaultBody)
      headers = { "Content-Type": "application/json" }
    }

    const result = await seasonalWeatherApi(
      def.upstreamPath,
      {
        method: req.method,
        headers,
        body,
      },
      def.capability
    )

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof SeasonalWeatherApiError) {
      return problemJson({
        type: "/problems/upstream-seasonalweather-error",
        title: "SeasonalWeather API request failed",
        status: error.status,
        detail:
          typeof error.body === "object" && error.body?.error
            ? String(error.body.error)
            : error.message,
        extensions: { upstream_status: error.status },
      })
    }

    const message = problemDetailFromError(error, "Unexpected upstream error")

    return problemJson({
      type: "/problems/upstream-seasonalweather-error",
      title: "SeasonalWeather proxy failed",
      status: 500,
      detail: message,
    })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handle(req, params)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handle(req, params)
}
