import { getPbxSelfSession, isSessionResponse } from "@/lib/server/pbx-session"
import { listOperationsForDiscordId, problemResponse } from "@/lib/server/pbx-controld"

export const runtime = "nodejs"

export async function GET() {
  const self = await getPbxSelfSession()
  if (isSessionResponse(self)) return self

  try {
    const operations = await listOperationsForDiscordId(self.discordId)
    return Response.json({ operations })
  } catch (error) {
    return problemResponse(error)
  }
}
