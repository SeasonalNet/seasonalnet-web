import { getPbxSelfSession, isSessionResponse } from "@/lib/server/pbx-session"
import { getExtensionByDiscordId, problemResponse, updateExtensionProfile } from "@/lib/server/pbx-controld"
import { pbxJsonResponse } from "@/lib/server/pbx-response"

export const runtime = "nodejs"

type ProfileBody = {
  displayName?: unknown
}

export async function PATCH(request: Request) {
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
          detail: "Claim an extension before updating its profile.",
        },
        { status: 404 },
      )
    }

    const body = (await request.json().catch(() => ({}))) as ProfileBody
    const displayName = typeof body.displayName === "string" && body.displayName.trim() ? body.displayName.trim() : null
    const result = await updateExtensionProfile({ extension: owner.extension, displayName })
    return pbxJsonResponse(result, { status: 202 })
  } catch (error) {
    return problemResponse(error)
  }
}
