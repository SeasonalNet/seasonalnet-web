import NextAuth from "next-auth"

const authentikIssuer = process.env.AUTH_AUTHENTIK_ISSUER!

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
      if (profile) {
        token.email = profile.email ?? token.email
        token.name = profile.name ?? token.name
        token.preferred_username =
          (profile as Record<string, unknown>).preferred_username as
            | string
            | undefined
        token.groups =
          (profile as Record<string, unknown>).groups as string[] | undefined
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.email === "string") session.user.email = token.email
        if (typeof token.name === "string") session.user.name = token.name
      }

      ;(session as any).preferred_username =
        typeof token.preferred_username === "string"
          ? token.preferred_username
          : undefined

      ;(session as any).groups = Array.isArray(token.groups)
        ? token.groups.filter((value): value is string => typeof value === "string")
        : []

      return session
    },
  },
})
