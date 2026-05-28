import { NextResponse } from "next/server"
import { loadAnnouncements } from "@/lib/announcements"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const host = req.headers.get("host") || ""
  const document = await loadAnnouncements({ host })

  return NextResponse.json(document, {
    headers: {
      "Cache-Control": "no-store",
    },
  })
}
