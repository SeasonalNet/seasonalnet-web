import NextAuth from "next-auth"

import {
  accessTierLabel,
  buildAccessPolicyFromEnv,
  isAuthorizedGroups,
  resolveAccessTier,
  type AccessTier,
} from "@seasonalnet/shell/src/lib/authz"

const authentikIssuer = process.env.AUTH_AUTHENTIK_ISSUER!
const accessPolicy = buildAccessPolicyFromEnv("AUTH_AUTHENTIK_PBX")
const discordIdClaimName = process.env.PBX_DISCORD_ID_CLAIM || process.env.AUTH_AUTHENTIK_PBX_DISCORD_ID_CLAIM || "discord_id"

export type PbxSession = {
  user?: {
    id?: string | null
    name?: string | null
    email?: string | null
  } | null
  preferred_username?: string | null
  groups?: string[]
  access_tier?: AccessTier | null
  is_authorized?: boolean
  discord_id?: string | null
}

type SessionLike = PbxSession | null | undefined

function normalizeGroups(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
}

function normalizeDiscordId(value: unknown): string | null {
  if (typeof value === "string" && /^[0-9]{5,32}$/.test(value)) return value
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value)
  return null
}

function profileClaim(profile: Record<string, unknown>, claimName: string): unknown {
  if (Object.prototype.hasOwnProperty.call(profile, claimName)) return profile[claimName]
  return undefined
}

function applyTokenClaims(token: Record<string, unknown>, profile?: Record<string, unknown>) {
  if (!profile) return token

  token.email = typeof profile.email === "string" ? profile.email : token.email
  token.name = typeof profile.name === "string" ? profile.name : token.name
  token.preferred_username =
    typeof profile.preferred_username === "string"
      ? profile.preferred_username
      : token.preferred_username
  token.groups = normalizeGroups(profile.groups)
  token.discord_id = normalizeDiscordId(profileClaim(profile, discordIdClaimName)) ?? token.discord_id
  if (typeof profile.sub === "string") token.sub = profile.sub
  return token
}

function applySessionClaims<TSession extends PbxSession>(
  session: TSession,
  token: Record<string, unknown>,
): TSession {
  if (session.user) {
    if (typeof token.email === "string") session.user.email = token.email
    if (typeof token.name === "string") session.user.name = token.name
    if (typeof token.sub === "string") session.user.id = token.sub
  }

  const groups = normalizeGroups(token.groups)
  const tier = resolveAccessTier(groups, accessPolicy)

  session.preferred_username =
    typeof token.preferred_username === "string" ? token.preferred_username : undefined
  session.groups = groups
  session.access_tier = tier
  session.is_authorized = isAuthorizedGroups(groups, accessPolicy)
  session.discord_id = normalizeDiscordId(token.discord_id)

  if (!session.discord_id && process.env.NODE_ENV !== "production") {
    session.discord_id = normalizeDiscordId(process.env.PBX_DEV_DISCORD_ID)
  }

  return session
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: process.env.NODE_ENV !== "production",
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    {
      id: "authentik",
      name: "SeasonalNet Auth",
      type: "oidc",
      issuer: authentikIssuer,
      wellKnown: `${authentikIssuer}.well-known/openid-configuration`,
      clientId: process.env.AUTH_AUTHENTIK_ID,
      clientSecret: process.env.AUTH_AUTHENTIK_SECRET,
      authorization: {
        params: {
          scope: "openid profile email",
        },
      },
    },
  ],
  callbacks: {
    async jwt({ token, profile }) {
      return applyTokenClaims(token as Record<string, unknown>, profile as Record<string, unknown> | undefined) as typeof token
    },
    async session({ session, token }) {
      return applySessionClaims(session as PbxSession, token as Record<string, unknown>) as typeof session
    },
  },
})

export function getSessionGroups(session: SessionLike): string[] {
  return normalizeGroups(session?.groups)
}

export function getSessionAccessTier(session: SessionLike) {
  const groups = getSessionGroups(session)
  return resolveAccessTier(groups, accessPolicy)
}

export function isAuthorizedSession(session: SessionLike): boolean {
  if (!session?.user) return false
  return isAuthorizedGroups(getSessionGroups(session), accessPolicy)
}

export function sessionDisplayName(session: SessionLike) {
  return (
    session?.user?.name ||
    session?.preferred_username ||
    (session?.user ? "Signed in" : "Not signed in")
  )
}

export function sessionInitials(session: SessionLike) {
  const source = (session?.user?.name || session?.user?.email || session?.preferred_username || "?").trim()
  const parts = source.split(/\s+/).filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }

  return source.slice(0, 2).toUpperCase()
}

export function sessionAccessTierLabel(session: SessionLike) {
  return accessTierLabel(getSessionAccessTier(session))
}

export function sessionDiscordId(session: SessionLike): string | null {
  return normalizeDiscordId(session?.discord_id)
}
