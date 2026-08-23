import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AuthorizedAgentSession } from "./agent-auth"
import { buildTrustedAgentChatPayload, buildTrustedSessionsPrefix } from "./agent-caller-context"

const authHelpers = vi.hoisted(() => ({
  buildAgentSessionPrefix: vi.fn(() => "web:operator-1:"),
  createAgentSessionId: vi.fn(() => "web:operator-1:session:new"),
  ensureAgentSessionOwnership: vi.fn((_session: unknown, sessionId: string) => sessionId.startsWith("web:operator-1:")),
  getAgentCallerIdentity: vi.fn(() => ({ userId: "operator-1", userName: "Seasonal Operator", accessTier: "operations" })),
}))

vi.mock("./agent-auth", () => authHelpers)

const session = {
  user: { id: "operator-1", name: "Seasonal Operator", email: "operator@example.test" },
  expires: "2099-01-01T00:00:00Z",
} as AuthorizedAgentSession

beforeEach(() => {
  vi.clearAllMocks()
})

describe("buildTrustedAgentChatPayload", () => {
  it("normalizes browser input and supplies trusted caller identity", () => {
    const payload = buildTrustedAgentChatPayload(session, {
      message: "  check the station  ",
      persist_history: false,
      agent_profile: "  operations  ",
      web_context: {
        target: `  ${"station".repeat(20)}  `,
        executionMode: "tool_required",
        confirmedTools: [" status ", "status", "", " restart "],
      },
    })

    expect(payload).toMatchObject({
      message: "check the station",
      session_id: "web:operator-1:session:new",
      persist_history: false,
      agent_profile: "operations",
      caller_context: {
        source: "seasonalnet-agent-spa",
        transport: "web-ui",
        user_id: "operator-1",
        user_name: "Seasonal Operator",
        metadata: {
          access_tier: "operations",
          execution_mode: "tool_required",
          confirmed_tools: ["status", "restart"],
        },
      },
    })
    expect(payload.caller_context.target).toHaveLength(96)
  })

  it("keeps an owned session and drops untrusted optional values", () => {
    const payload = buildTrustedAgentChatPayload(session, {
      message: "hello",
      session_id: "web:operator-1:session:existing",
      web_context: {
        target: "   ",
        executionMode: "arbitrary" as "text_only",
        confirmedTools: [7 as unknown as string],
      },
    })

    expect(payload.session_id).toBe("web:operator-1:session:existing")
    expect(payload.persist_history).toBe(true)
    expect(payload.caller_context.target).toBeUndefined()
    expect(payload.caller_context.metadata.execution_mode).toBeUndefined()
    expect(payload.caller_context.metadata.confirmed_tools).toBeUndefined()
  })

  it("rejects empty messages and sessions owned by another operator", () => {
    expect(() => buildTrustedAgentChatPayload(session, { message: "  " })).toThrow("Message must not be empty")
    expect(() => buildTrustedAgentChatPayload(session, {
      message: "hello",
      session_id: "web:other-user:session:1",
    })).toThrow("does not belong")
  })

  it("derives the trusted session prefix through the authorization boundary", () => {
    expect(buildTrustedSessionsPrefix(session)).toBe("web:operator-1:")
    expect(authHelpers.buildAgentSessionPrefix).toHaveBeenCalledWith(session)
  })
})
