import { NextResponse } from "next/server"
import { problemDetailFromError, problemJson } from "@seasonalnet/shell/src/lib/server/problem"

import { getAgentCallerIdentity, requireAuthorizedAgentSession } from "@/lib/server/agent-auth"
import { seasonalAgentJson } from "@/lib/server/seasonal-agent"

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
    const identity = getAgentCallerIdentity(session)
    const params = new URLSearchParams({
      source: "seasonalnet-agent-spa",
      transport: "web-ui",
      user_id: identity.userId,
      user_name: identity.userName,
    })
    if (identity.accessTier) params.set("access_tier", identity.accessTier)

    const { ok, status, payload } = await seasonalAgentJson(`/api/v1/tools?${params.toString()}`, {
      method: "GET",
      signal: request.signal,
    })

    return NextResponse.json(payload, { status: ok ? 200 : status })
  } catch (error) {
    const message = problemDetailFromError(error, "Unexpected upstream error")
    return problemJson({
      type: "/problems/upstream-agent-error",
      title: "Seasonal Agent request failed",
      status: 500,
      detail: message,
    })
  }
}
