import { auth, isAuthorizedSession, sessionDiscordId, sessionDisplayName } from "@/auth"

export type PbxSelfSession = {
  displayName: string
  email: string | null
  discordId: string
}

export async function getPbxSelfSession(): Promise<PbxSelfSession | Response> {
  const session = await auth()

  if (!isAuthorizedSession(session)) {
    return Response.json(
      {
        type: "https://seasonalnet.org/problems/unauthorized",
        title: "Unauthorized",
        status: 401,
        detail: "Sign in to use the PBX dashboard.",
      },
      { status: 401 },
    )
  }

  const discordId = sessionDiscordId(session)
  if (!discordId) {
    return Response.json(
      {
        type: "https://seasonalnet.org/problems/discord-account-not-linked",
        title: "Discord account not linked",
        status: 409,
        detail: "This SeasonalNet Auth session does not include a Discord ID claim.",
      },
      { status: 409 },
    )
  }

  return {
    displayName: sessionDisplayName(session),
    email: session?.user?.email || null,
    discordId,
  }
}

export function isSessionResponse(value: PbxSelfSession | Response): value is Response {
  return value instanceof Response
}
