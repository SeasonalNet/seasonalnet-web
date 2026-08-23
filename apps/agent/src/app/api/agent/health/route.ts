import { NextResponse } from "next/server"
import { problemJson } from "@seasonalnet/shell/src/lib/server/problem"
import { fetchWithTimeout, isTimeoutError } from "@seasonalnet/shell/src/lib/fetch"

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
    const upstream = await fetchWithTimeout(`${seasonalAgentBaseUrl()}/healthz`, {
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
    const timedOut = isTimeoutError(error)
    return problemJson({
      type: "/problems/upstream-agent-health-error",
      title: "Seasonal Agent health request failed",
      status: timedOut ? 504 : 502,
      detail: timedOut ? "The Seasonal Agent health check timed out." : "The Seasonal Agent health service is unavailable.",
    })
  }
}
