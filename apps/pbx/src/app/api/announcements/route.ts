import { NextResponse } from "next/server"
import { loadAnnouncements, getActiveAnnouncementsFrom } from "@seasonalnet/shell/src/lib/announcements"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const host = req.headers.get("host") || ""
  const { items: all, etag } = await loadAnnouncements()

  if (etag && req.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        "Cache-Control": "no-store",
        ETag: etag,
      },
    })
  }

  const items = getActiveAnnouncementsFrom(all, new Date(), { host })

  return NextResponse.json(
    { items, generatedAt: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "no-store",
        ...(etag ? { ETag: etag } : {}),
      },
    }
  )
}

