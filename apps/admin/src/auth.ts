import NextAuth from "next-auth"

import {
  accessTierLabel,
  buildAccessPolicyFromEnv,
  isAuthorizedGroups,
  resolveAccessTier,
} from "@seasonalnet/shell/src/lib/authz"

const authentikIssuer = process.env.AUTH_AUTHENTIK_ISSUER!
const accessPolicy = buildAccessPolicyFromEnv("AUTH_AUTHENTIK_ADMIN")

type SessionLike = {
  user?: {
    id?: string | null
    name?: string | null
    email?: string | null
  } | null
  preferred_username?: string | null
  groups?: string[]
  access_tier?: "status" | "operations" | "administration" | null
  is_authorized?: boolean
} | null | undefined

function normalizeGroups(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
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
  if (typeof profile.sub === "string") token.sub = profile.sub
  return token
}

function applySessionClaims(session: any, token: Record<string, unknown>) {
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
      return applySessionClaims(session, token as Record<string, unknown>)
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
