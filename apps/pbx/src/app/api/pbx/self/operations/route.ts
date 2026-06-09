import { getPbxSelfSession, isSessionResponse } from "@/lib/server/pbx-session"
import { listOperationsForDiscordId, problemResponse } from "@/lib/server/pbx-controld"
import { pbxJsonResponse } from "@/lib/server/pbx-response"

export const runtime = "nodejs"

export async function GET() {
  const self = await getPbxSelfSession()
  if (isSessionResponse(self)) return self

  try {
    const operations = await listOperationsForDiscordId(self.discordId)
    return pbxJsonResponse({ operations })
  } catch (error) {
    return problemResponse(error)
  }
}
