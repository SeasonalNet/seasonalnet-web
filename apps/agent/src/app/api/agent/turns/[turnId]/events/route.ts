import { NextResponse } from "next/server"
import { problemDetailFromError, problemJson } from "@seasonalnet/shell/src/lib/server/problem"

import { ensureAgentSessionOwnership, requireAuthorizedAgentSession } from "@/lib/server/agent-auth"
import { seasonalAgentJson } from "@/lib/server/seasonal-agent"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ turnId: string }> },
) {
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
    const { turnId } = await params
    const url = new URL(request.url)
    const sessionId = url.searchParams.get("session_id")
    if (!ensureAgentSessionOwnership(session, sessionId)) {
      return problemJson({
        type: "/problems/forbidden",
        title: "Forbidden",
        status: 403,
        detail: "The authenticated user is not allowed to access this resource.",
      })
    }

    const upstream = new URL(`/api/v1/chat/turns/${encodeURIComponent(turnId)}/events`, "http://seasonal-agent.internal")
    const afterSequence = url.searchParams.get("after_sequence")
    if (sessionId) upstream.searchParams.set("session_id", sessionId)
    if (afterSequence) upstream.searchParams.set("after_sequence", afterSequence)

    const { ok, status, payload } = await seasonalAgentJson(`${upstream.pathname}${upstream.search}`, {
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
