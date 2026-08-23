import { beforeEach, describe, expect, it, vi } from "vitest"

const authBoundary = vi.hoisted(() => ({
  auth: vi.fn(),
  isAuthorizedSession: vi.fn(),
  sessionDiscordId: vi.fn(),
  sessionDisplayName: vi.fn(() => "Operator"),
}))

vi.mock("../../auth", () => authBoundary)

import { getPbxSelfSession, isSessionResponse } from "./pbx-session"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getPbxSelfSession", () => {
  it("rejects unauthenticated sessions", async () => {
    authBoundary.isAuthorizedSession.mockReturnValue(false)
    const result = await getPbxSelfSession()
    expect(isSessionResponse(result)).toBe(true)
    expect((result as Response).status).toBe(401)
  })

  it("rejects authorized sessions without a Discord claim", async () => {
    authBoundary.auth.mockResolvedValue({ user: { email: "operator@example.test" } })
    authBoundary.isAuthorizedSession.mockReturnValue(true)
    authBoundary.sessionDiscordId.mockReturnValue(null)
    const result = await getPbxSelfSession()
    expect(isSessionResponse(result)).toBe(true)
    expect((result as Response).status).toBe(409)
  })

  it("returns the bounded PBX caller identity", async () => {
    authBoundary.auth.mockResolvedValue({ user: { email: "operator@example.test" } })
    authBoundary.isAuthorizedSession.mockReturnValue(true)
    authBoundary.sessionDiscordId.mockReturnValue("discord-1")
    const result = await getPbxSelfSession()
    expect(result).toEqual({ displayName: "Operator", email: "operator@example.test", discordId: "discord-1" })
    expect(isSessionResponse(result)).toBe(false)
  })
})
