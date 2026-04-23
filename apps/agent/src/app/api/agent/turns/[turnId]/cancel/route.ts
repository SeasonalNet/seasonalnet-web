import { NextResponse } from "next/server"

import { ensureAgentSessionOwnership, requireAuthorizedAgentSession } from "@/lib/server/agent-auth"
import { seasonalAgentJson } from "@/lib/server/seasonal-agent"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ turnId: string }> },
) {
  const authResult = await requireAuthorizedAgentSession()
  if (authResult.response) return authResult.response
  const session = authResult.session
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  try {
    const { turnId } = await params
    const url = new URL(request.url)
    const sessionId = url.searchParams.get("session_id")

    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "Missing session_id." }, { status: 400 })
    }
    if (!ensureAgentSessionOwnership(session, sessionId)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
    }

    const suffix = `?session_id=${encodeURIComponent(sessionId)}`
    const { ok, status, payload } = await seasonalAgentJson(
      `/api/v1/chat/turns/${encodeURIComponent(turnId)}/cancel${suffix}`,
      {
        method: "POST",
        signal: request.signal,
      },
    )

    return NextResponse.json(payload, { status: ok ? 200 : status })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected upstream error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
