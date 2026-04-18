import { randomUUID } from "node:crypto"

import type { Session } from "next-auth"
import { NextResponse } from "next/server"

import { auth, getSessionAccessTier, isAuthorizedSession } from "@/auth"

type SessionUser = NonNullable<Session["user"]> & {
  id?: string | null
}

export type AuthorizedAgentSession = Session & {
  user: SessionUser
  preferred_username?: string | null
  groups?: string[]
  access_tier?: "status" | "operations" | "administration" | null
  is_authorized?: boolean
}

function preferredUsername(session: AuthorizedAgentSession) {
  return (session as { preferred_username?: string | null }).preferred_username
}

function normalizeUserId(value?: string | null) {
  return (value || "anonymous").trim().replace(/[^a-zA-Z0-9:_-]/g, "-") || "anonymous"
}

export async function requireAuthorizedAgentSession() {
  const session = await auth()

  if (!session?.user) {
    return {
      response: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }),
      session: null,
    }
  }

  if (!isAuthorizedSession(session)) {
    return {
      response: NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }),
      session: null,
    }
  }

  return {
    response: null,
    session: session as AuthorizedAgentSession,
  }
}

export function getAuthorizedAgentUserId(session: AuthorizedAgentSession) {
  return normalizeUserId(session.user?.id || session.user?.email || preferredUsername(session))
}

export function buildAgentSessionPrefix(session: AuthorizedAgentSession) {
  return `web:${getAuthorizedAgentUserId(session)}:`
}

export function createAgentSessionId(session: AuthorizedAgentSession) {
  return `${buildAgentSessionPrefix(session)}session:${randomUUID()}`
}

export function ensureAgentSessionOwnership(
  session: AuthorizedAgentSession,
  sessionId: string | null | undefined,
) {
  if (!sessionId) return true
  return sessionId.startsWith(buildAgentSessionPrefix(session))
}

export function getAgentCallerIdentity(session: AuthorizedAgentSession) {
  return {
    userId: getAuthorizedAgentUserId(session),
    userName:
      session.user?.name ||
      preferredUsername(session) ||
      session.user?.email ||
      getAuthorizedAgentUserId(session),
    accessTier: getSessionAccessTier(session),
  }
}
