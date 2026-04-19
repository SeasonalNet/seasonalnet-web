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

export type AgentStreamEvent = {
  type: string
  sequence: number
  created_at: string
  session_id: string
  turn_id?: string
  payload: Record<string, unknown>
}

export type AgentActiveTurn = {
  turn_id: string
  session_id: string
  status: "queued" | "running" | "completed" | "failed" | "aborted" | string
  profile_id?: string | null
  user_message?: string | null
  caller_context_json?: Record<string, unknown> | null
  started_at?: string | null
  updated_at?: string | null
  completed_at?: string | null
  error_code?: string | null
  error_message?: string | null
  snapshot_last_sequence?: number | null
}

export type AgentTurnSnapshot = {
  turn_id: string
  last_sequence: number
  assistant_content: string
  thinking_content?: string | null
  tool_state_json?: {
    events?: Array<Record<string, unknown>>
  } | null
  updated_at?: string | null
}
