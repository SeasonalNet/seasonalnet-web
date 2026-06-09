import { getPbxSelfSession, isSessionResponse } from "@/lib/server/pbx-session"
import { assertSelfServiceCredentialAllowed, getExtensionByDiscordId, problemResponse, rotateExtensionCredentials } from "@/lib/server/pbx-controld"
import { pbxJsonResponse } from "@/lib/server/pbx-response"

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
      return pbxJsonResponse(
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
    assertSelfServiceCredentialAllowed(owner)

    const result = await rotateExtensionCredentials(owner.extension, body.resetVoicemailPin === true)
    return pbxJsonResponse(result, { status: 202 })
  } catch (error) {
    return problemResponse(error)
  }
}
