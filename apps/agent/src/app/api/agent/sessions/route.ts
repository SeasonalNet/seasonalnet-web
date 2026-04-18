import { NextResponse } from "next/server"

import { buildTrustedSessionsPrefix } from "@/lib/server/agent-caller-context"
import { requireAuthorizedAgentSession } from "@/lib/server/agent-auth"
import { seasonalAgentJson } from "@/lib/server/seasonal-agent"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const authResult = await requireAuthorizedAgentSession()
  if (authResult.response) return authResult.response
  const session = authResult.session
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  try {
    const url = new URL(request.url)
    const limit = url.searchParams.get("limit") || "20"
    const prefix = buildTrustedSessionsPrefix(session)
    const { ok, status, payload } = await seasonalAgentJson(
      `/api/v1/chat/sessions?limit=${encodeURIComponent(limit)}&prefix=${encodeURIComponent(prefix)}`,
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
