import { NextResponse } from "next/server"
import { problemDetailFromError, problemJson } from "@seasonalnet/shell/src/lib/server/problem"

import { requireAuthorizedAgentSession } from "@/lib/server/agent-auth"
import { seasonalAgentBaseUrl, seasonalAgentHeaders } from "@/lib/server/seasonal-agent"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const authResult = await requireAuthorizedAgentSession()
  if (authResult.response) return authResult.response
  const session = authResult.session
  if (!session) return problemJson({
    type: "/problems/unauthorized",
    title: "Unauthorized",
    status: 401,
    detail: "Authentication is required.",
  })

  try {
    const upstream = await fetch(`${seasonalAgentBaseUrl()}/healthz`, {
      headers: seasonalAgentHeaders(),
      cache: "no-store",
      signal: request.signal,
    })

    const text = await upstream.text()

    if (!upstream.ok) {
      return problemJson({
        type: "/problems/upstream-agent-health-error",
        title: "Seasonal Agent health check failed",
        status: 502,
        detail: text || `Seasonal Agent health check failed: ${upstream.status}`,
        extensions: { upstream_status: upstream.status },
      })
    }

    return NextResponse.json({ ok: text.trim() === "ok", status: upstream.status })
  } catch (error) {
    const message = problemDetailFromError(error, "Upstream health request failed")
    return problemJson({
      type: "/problems/upstream-agent-health-error",
      title: "Seasonal Agent health request failed",
      status: 500,
      detail: message,
    })
  }
}
