import { NextResponse } from "next/server"

import { seasonalAgentJson } from "@/lib/server/seasonal-agent"

export const runtime = "nodejs"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params
    const url = new URL(request.url)
    const limit = url.searchParams.get("limit") || "100"
    const { ok, status, payload } = await seasonalAgentJson(
      `/api/v1/chat/sessions/${encodeURIComponent(sessionId)}?limit=${encodeURIComponent(limit)}`,
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
