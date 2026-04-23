import { NextResponse } from "next/server"

import { ensureAgentSessionOwnership, requireAuthorizedAgentSession } from "@/lib/server/agent-auth"
import { seasonalAgentJson } from "@/lib/server/seasonal-agent"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const authResult = await requireAuthorizedAgentSession()
  if (authResult.response) return authResult.response
  const session = authResult.session
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  try {
    const { sessionId } = await params
    if (!ensureAgentSessionOwnership(session, sessionId)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
    }

    const { ok, status, payload } = await seasonalAgentJson(
      `/api/v1/chat/sessions/${encodeURIComponent(sessionId)}/recoverable-turn`,
      {
        method: "GET",
        signal: request.signal,
      },
    )

    return NextResponse.json(payload, { status: ok ? 200 : status })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected upstream error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
