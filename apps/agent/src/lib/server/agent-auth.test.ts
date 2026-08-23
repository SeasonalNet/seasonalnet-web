import { beforeEach, describe, expect, it, vi } from "vitest"

const authBoundary = vi.hoisted(() => ({
  auth: vi.fn(),
  getSessionAccessTier: vi.fn(() => "operations"),
  isAuthorizedSession: vi.fn(() => true),
}))

vi.mock("../../auth", () => authBoundary)

import {
  buildAgentSessionPrefix,
  createAgentSessionId,
  ensureAgentSessionOwnership,
  getAgentCallerIdentity,
  requireAuthorizedAgentSession,
  type AuthorizedAgentSession,
} from "./agent-auth"

const session = {
  user: { id: "operator / one", name: "Operator One", email: "operator@example.test" },
  expires: "2099-01-01T00:00:00Z",
} as AuthorizedAgentSession

beforeEach(() => {
  vi.clearAllMocks()
  authBoundary.isAuthorizedSession.mockReturnValue(true)
})

describe("agent session authorization", () => {
  it("returns a problem response for missing and forbidden sessions", async () => {
    authBoundary.auth.mockResolvedValueOnce(null)
    const missing = await requireAuthorizedAgentSession()
    expect(missing.session).toBeNull()
    expect(missing.response?.status).toBe(401)

    authBoundary.auth.mockResolvedValueOnce(session)
    authBoundary.isAuthorizedSession.mockReturnValueOnce(false)
    const forbidden = await requireAuthorizedAgentSession()
    expect(forbidden.session).toBeNull()
    expect(forbidden.response?.status).toBe(403)
  })

  it("returns the authorized session", async () => {
    authBoundary.auth.mockResolvedValue(session)
    await expect(requireAuthorizedAgentSession()).resolves.toEqual({ response: null, session })
  })

  it("creates normalized, operator-owned session identifiers", () => {
    const prefix = buildAgentSessionPrefix(session)
    const sessionId = createAgentSessionId(session)
    expect(prefix).toBe("web:operator---one:")
    expect(sessionId).toMatch(/^web:operator---one:session:/)
    expect(ensureAgentSessionOwnership(session, sessionId)).toBe(true)
    expect(ensureAgentSessionOwnership(session, null)).toBe(true)
    expect(ensureAgentSessionOwnership(session, "web:someone-else:session:1")).toBe(false)
  })

  it("falls back across available identity claims", () => {
    expect(getAgentCallerIdentity(session)).toEqual({
      userId: "operator---one",
      userName: "Operator One",
      accessTier: "operations",
    })
    const emailSession = {
      ...session,
      user: { name: null, email: "operator+alerts@example.test" },
    }
    expect(getAgentCallerIdentity(emailSession).userId).toBe("operator-alerts-example-test")
  })
})
