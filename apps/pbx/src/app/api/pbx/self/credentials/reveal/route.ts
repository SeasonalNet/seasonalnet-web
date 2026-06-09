import { getPbxSelfSession, isSessionResponse } from "@/lib/server/pbx-session"
import { getExtensionByDiscordId, problemResponse, revealExtensionCredentials } from "@/lib/server/pbx-controld"

export const runtime = "nodejs"

export async function POST() {
  const self = await getPbxSelfSession()
  if (isSessionResponse(self)) return self

  try {
    const owner = await getExtensionByDiscordId(self.discordId)
    if (!owner) {
      return Response.json(
        {
          type: "https://seasonalnet.org/problems/extension-not-claimed",
          title: "Extension not claimed",
          status: 404,
          detail: "Claim an extension before revealing credentials.",
        },
        { status: 404 },
      )
    }

    const result = await revealExtensionCredentials(owner.extension)
    return Response.json(result)
  } catch (error) {
    return problemResponse(error)
  }
}
