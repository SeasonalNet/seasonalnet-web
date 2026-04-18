import { NextResponse } from "next/server"

import { requireAuthorizedAgentSession } from "@/lib/server/agent-auth"
import { seasonalAgentBaseUrl, seasonalAgentHeaders } from "@/lib/server/seasonal-agent"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const authResult = await requireAuthorizedAgentSession()
  if (authResult.response) return authResult.response
  const session = authResult.session
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  try {
    const upstream = await fetch(`${seasonalAgentBaseUrl()}/healthz`, {
      headers: seasonalAgentHeaders(),
      cache: "no-store",
      signal: request.signal,
    })

    const text = await upstream.text()

    return NextResponse.json(
      { ok: upstream.ok && text.trim() === "ok", status: upstream.status },
      { status: upstream.ok ? 200 : 502 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upstream health request failed"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
