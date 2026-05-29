import { NextResponse } from "next/server"
import { problemDetailFromError, problemJson } from "@seasonalnet/shell/src/lib/server/problem"

import type { BrowserAgentChatRequest } from "@/lib/agent/chat-types"
import { buildTrustedAgentChatPayload } from "@/lib/server/agent-caller-context"
import { requireAuthorizedAgentSession } from "@/lib/server/agent-auth"
import { seasonalAgentJson } from "@/lib/server/seasonal-agent"

export const runtime = "nodejs"

export async function POST(request: Request) {
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
    const body = (await request.json()) as BrowserAgentChatRequest
    const trustedBody = buildTrustedAgentChatPayload(session, body)
    const { ok, status, payload } = await seasonalAgentJson("/api/v1/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trustedBody),
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
