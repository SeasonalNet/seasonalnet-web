import { getPbxSelfSession, isSessionResponse } from "@/lib/server/pbx-session"
import { getExtensionByDiscordId, problemResponse, rotateExtensionCredentials } from "@/lib/server/pbx-controld"

export const runtime = "nodejs"

type RotateBody = {
  resetVoicemailPin?: unknown
}

export async function POST(request: Request) {
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
          detail: "Claim an extension before rotating credentials.",
        },
        { status: 404 },
      )
    }

    const body = (await request.json().catch(() => ({}))) as RotateBody
    const result = await rotateExtensionCredentials(owner.extension, body.resetVoicemailPin === true)
    return Response.json(result, { status: 202 })
  } catch (error) {
    return problemResponse(error)
  }
}
