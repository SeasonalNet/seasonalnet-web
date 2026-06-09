import { getPbxSelfSession, isSessionResponse } from "@/lib/server/pbx-session"
import { getExtensionByDiscordId, getPoolSummary, listOperationsForDiscordId, problemResponse } from "@/lib/server/pbx-controld"

export const runtime = "nodejs"

export async function GET() {
  const self = await getPbxSelfSession()
  if (isSessionResponse(self)) return self

  try {
    const [owner, poolSummary, operations] = await Promise.all([
      getExtensionByDiscordId(self.discordId),
      getPoolSummary(),
      listOperationsForDiscordId(self.discordId).catch(() => []),
    ])

    return Response.json({
      user: self,
      owner,
      poolSummary,
      operations,
    })
  } catch (error) {
    return problemResponse(error)
  }
}
