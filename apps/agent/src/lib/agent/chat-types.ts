export type AgentExecutionMode =
  | "text_only"
  | "tool_optional"
  | "tool_required"
  | "workflow_required"

export type AgentTurnFlags = {
  target?: string
  executionMode?: AgentExecutionMode | ""
  confirmedTools?: string[]
}

export type BrowserAgentChatRequest = {
  message: string
  session_id?: string
  persist_history?: boolean
  agent_profile?: string
  web_context?: AgentTurnFlags
}

export type AgentToolDescriptor = {
  name: string
  description: string
  parameters?: Record<string, unknown>
}
