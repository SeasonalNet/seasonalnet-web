import { problemJson } from "@seasonalnet/shell/src/lib/server/problem"
import { fetchWithTimeout, isTimeoutError } from "@seasonalnet/shell/src/lib/fetch"

import type { BrowserAgentChatRequest } from "@/lib/agent/chat-types"
import { buildTrustedAgentChatPayload } from "@/lib/server/agent-caller-context"
import { requireAuthorizedAgentSession } from "@/lib/server/agent-auth"
import { seasonalAgentBaseUrl, seasonalAgentHeaders } from "@/lib/server/seasonal-agent"

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

  let body: BrowserAgentChatRequest
  try {
    body = (await request.json()) as BrowserAgentChatRequest
  } catch {
    return problemJson({
      type: "/problems/invalid-json",
      title: "Invalid request body",
      status: 400,
      detail: "The request body must be valid JSON.",
    })
  }

  try {
    const trustedBody = buildTrustedAgentChatPayload(session, body)
    const upstream = await fetchWithTimeout(`${seasonalAgentBaseUrl()}/api/v1/chat/stream`, {
      method: "POST",
      headers: seasonalAgentHeaders({
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      }),
      body: JSON.stringify(trustedBody),
      cache: "no-store",
      signal: request.signal,
    })

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text()
      const status = upstream.status || 502
      return problemJson({
        type: "/problems/upstream-agent-stream-error",
        title: "Seasonal Agent stream request failed",
        status,
        detail: text || `Seasonal Agent stream request failed: ${status}`,
        extensions: { upstream_status: upstream.status || null },
      })
    }

    const headers = new Headers()
    headers.set("Content-Type", "text/event-stream; charset=utf-8")
    headers.set("Cache-Control", "no-cache, no-transform")
    headers.set("X-Accel-Buffering", "no")

    return new Response(upstream.body, {
      status: 200,
      headers,
    })
  } catch (error) {
    const timedOut = isTimeoutError(error)
    return problemJson({
      type: "/problems/upstream-agent-stream-error",
      title: "Seasonal Agent stream request failed",
      status: timedOut ? 504 : 502,
      detail: timedOut ? "The Seasonal Agent stream timed out." : "The Seasonal Agent stream is unavailable.",
    })
  }
}
