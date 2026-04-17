import { NextResponse } from "next/server"

import { seasonalAgentBaseUrl, seasonalAgentHeaders } from "@/lib/server/seasonal-agent"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const upstream = await fetch(`${seasonalAgentBaseUrl()}/api/v1/chat/stream`, {
      method: "POST",
      headers: seasonalAgentHeaders({
        "Content-Type": request.headers.get("content-type") || "application/json",
        Accept: "text/event-stream",
      }),
      body,
      cache: "no-store",
      signal: request.signal,
    })

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text()
      return NextResponse.json(
        {
          ok: false,
          error: text || `Seasonal Agent stream request failed: ${upstream.status}`,
        },
        { status: upstream.status || 502 },
      )
    }

    const headers = new Headers()
    headers.set("Content-Type", "text/event-stream; charset=utf-8")
    headers.set("Cache-Control", "no-cache, no-transform")
    headers.set("Connection", "keep-alive")
    headers.set("X-Accel-Buffering", "no")

    return new Response(upstream.body, {
      status: 200,
      headers,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected upstream stream error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
