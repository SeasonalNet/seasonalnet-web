import { getPbxSelfSession, isSessionResponse } from "@/lib/server/pbx-session"
import { claimExtension, problemResponse } from "@/lib/server/pbx-controld"

export const runtime = "nodejs"

type ClaimBody = {
  displayName?: unknown
}

export async function POST(request: Request) {
  const self = await getPbxSelfSession()
  if (isSessionResponse(self)) return self

  try {
    const body = (await request.json().catch(() => ({}))) as ClaimBody
    const displayName = typeof body.displayName === "string" && body.displayName.trim() ? body.displayName.trim() : self.displayName
    const result = await claimExtension({ discordId: self.discordId, displayName })
    return Response.json(result, { status: 202 })
  } catch (error) {
    return problemResponse(error)
  }
}
