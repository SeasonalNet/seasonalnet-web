import type { BrowserAgentChatRequest } from "../agent/chat-types"
import type { AuthorizedAgentSession } from "./agent-auth"
import {
  buildAgentSessionPrefix,
  createAgentSessionId,
  ensureAgentSessionOwnership,
  getAgentCallerIdentity,
} from "./agent-auth"

const EXECUTION_MODES = new Set([
  "text_only",
  "tool_optional",
  "tool_required",
  "workflow_required",
])

function cleanText(value: unknown, maxLength = 120) {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, maxLength)
}

function cleanExecutionMode(value: unknown) {
  if (typeof value !== "string") return undefined
  return EXECUTION_MODES.has(value) ? value : undefined
}

function cleanConfirmedTools(value: unknown) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean))]
}

export function buildTrustedAgentChatPayload(
  session: AuthorizedAgentSession,
  body: BrowserAgentChatRequest,
) {
  const message = typeof body.message === "string" ? body.message.trim() : ""
  if (!message) {
    throw new Error("Message must not be empty.")
  }

  if (body.session_id && !ensureAgentSessionOwnership(session, body.session_id)) {
    throw new Error("That session does not belong to the authenticated operator.")
  }

  const webContext = body.web_context ?? {}
  const target = cleanText(webContext.target, 96)
  const executionMode = cleanExecutionMode(webContext.executionMode)
  const confirmedTools = cleanConfirmedTools(webContext.confirmedTools)
  const identity = getAgentCallerIdentity(session)
  const requestedProfile =
    typeof body.agent_profile === "string" && body.agent_profile.trim()
      ? body.agent_profile.trim()
      : undefined

  return {
    message,
    session_id: body.session_id || createAgentSessionId(session),
    persist_history: body.persist_history !== false,
    agent_profile: requestedProfile,
    caller_context: {
      source: "seasonalnet-agent-spa",
      transport: "web-ui",
      user_id: identity.userId,
      user_name: identity.userName,
      target,
      metadata: {
        session_mode: "per_user_web_session",
        requested_profile: requestedProfile,
        access_tier: identity.accessTier || undefined,
        execution_mode: executionMode,
        confirmed_tools: confirmedTools.length > 0 ? confirmedTools : undefined,
      },
    },
  }
}

export function buildTrustedSessionsPrefix(session: AuthorizedAgentSession) {
  return buildAgentSessionPrefix(session)
}
