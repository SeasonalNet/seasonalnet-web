import { NextResponse } from "next/server"

import { seasonalAgentJson } from "@/lib/server/seasonal-agent"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const contentType = request.headers.get("content-type") || "application/json"
    const { ok, status, payload } = await seasonalAgentJson("/api/v1/chat", {
      method: "POST",
      headers: { "Content-Type": contentType },
      body,
      signal: request.signal,
    })

    return NextResponse.json(payload, { status: ok ? 200 : status })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected upstream error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
