"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Activity,
  Bot,
  Check,
  Command,
  Copy,
  Ellipsis,
  LoaderCircle,
  MessageSquare,
  Plus,
  Send,
  Square,
  Wrench,
  X,
} from "lucide-react"
import { toast } from "sonner"

import type {
  AgentActiveTurn,
  AgentExecutionMode,
  AgentStreamEvent,
  AgentToolDescriptor,
  AgentTurnFlags,
  AgentTurnSnapshot,
} from "@/lib/agent/chat-types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@seasonalnet/shell/src/components/ui/alert-dialog"
import { Badge } from "@seasonalnet/shell/src/components/ui/badge"
import { Button } from "@seasonalnet/shell/src/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@seasonalnet/shell/src/components/ui/dropdown-menu"
import { MarkdownContent } from "@seasonalnet/shell/src/components/ui/markdown-content"
import { Separator } from "@seasonalnet/shell/src/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@seasonalnet/shell/src/components/ui/tooltip"
import { cn } from "@seasonalnet/shell/src/lib/utils"

type SessionSummary = {
  session_id: string
  created_at: string
  updated_at: string
  title: string | null
}

type SessionMessage = {
  id: string
  turnId?: string
  role: "user" | "assistant" | "tool" | "system"
  content: string
  createdAt?: string
  toolName?: string | null
  rawJson?: unknown
  thinking?: string | null
  pending?: boolean
  streamKey?: string
}

type TurnResultPayload = {
  session_id: string
  assistant_message: string
  thinking?: string | null
}

type ToolsResponse = {
  tools?: AgentToolDescriptor[]
  error?: string
}

type SessionDetailResponse = {
  ok?: boolean
  messages?: Array<{
    id?: number | string
    role?: string
    content?: string
    created_at?: string
    tool_name?: string | null
    raw_json?: unknown
  }>
  active_turn?: AgentActiveTurn | null
  error?: string
}

type ActiveTurnResponse = {
  ok?: boolean
  session_id?: string
  active_turn?: AgentActiveTurn | null
  error?: string
}

type TurnSnapshotResponse = {
  ok?: boolean
  turn_id?: string
  snapshot?: AgentTurnSnapshot | null
  error?: string
}

type TurnEventsResponse = {
  ok?: boolean
  turn_id?: string
  events?: AgentStreamEvent[]
  error?: string
}

type RecoveryLoadOptions = {
  recoveryTurnId?: string | null
  silent?: boolean
}

type RefreshSessionsOptions = {
  preferredSessionId?: string | null
  includeHealth?: boolean
}

const EXECUTION_MODE_OPTIONS: Array<{
  value: AgentExecutionMode
  label: string
  description: string
}> = [
  {
    value: "tool_optional",
    label: "Tool optional",
    description: "Let Seasonal Agent decide whether tools are needed.",
  },
  {
    value: "tool_required",
    label: "Tool required",
    description: "Prefer verified tool output over a text-only answer.",
  },
  {
    value: "workflow_required",
    label: "Workflow required",
    description: "Bias toward multi-step operational checks when available.",
  },
  {
    value: "text_only",
    label: "Text only",
    description: "Keep this turn explanatory unless the runtime forces a tool.",
  },
]

const SELECTED_SESSION_STORAGE_KEY = "seasonalnet-agent:selected-session-id"

function shortSessionId(sessionId: string) {
  return sessionId.length <= 18 ? sessionId : `${sessionId.slice(0, 8)}…${sessionId.slice(-6)}`
}

function formatDate(value?: string) {
  if (!value) return "Unknown time"

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value))
  } catch {
    return value
  }
}

function prettyJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function extractThinking(rawJson: unknown) {
  if (!rawJson || typeof rawJson !== "object") return null
  const message = (rawJson as { message?: { thinking?: unknown } }).message
  return typeof message?.thinking === "string" && message.thinking.trim() ? message.thinking : null
}

async function parseJsonResponse<T>(response: Response, fallbackError: string): Promise<T> {
  const rawBody = await response.text()

  if (!rawBody.trim()) {
    return { error: fallbackError } as T
  }

  try {
    return JSON.parse(rawBody) as T
  } catch {
    return { error: fallbackError } as T
  }
}

function parseSseEvent(rawEvent: string) {
  const lines = rawEvent.split(/\r?\n/)
  const dataLines: string[] = []

  for (const line of lines) {
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  if (!dataLines.length) return null

  try {
    return JSON.parse(dataLines.join("\n")) as AgentStreamEvent
  } catch {
    return null
  }
}

function consumeSseBuffer(
  input: string,
  processEvent: (event: AgentStreamEvent) => void,
  options: { flushRemainder?: boolean } = {},
) {
  let buffer = input

  while (true) {
    const marker = /\r?\n\r?\n/.exec(buffer)
    if (!marker || marker.index === undefined) break

    const rawEvent = buffer.slice(0, marker.index)
    buffer = buffer.slice(marker.index + marker[0].length)

    const event = parseSseEvent(rawEvent)
    if (event) processEvent(event)
  }

  if (options.flushRemainder && buffer.trim()) {
    const event = parseSseEvent(buffer)
    if (event) {
      processEvent(event)
      return ""
    }
  }

  return buffer
}

function messageIcon(role: SessionMessage["role"]) {
  switch (role) {
    case "assistant":
      return Bot
    case "tool":
      return Wrench
    case "system":
      return Activity
    case "user":
    default:
      return MessageSquare
  }
}

function readStoredSelectedSessionId() {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage.getItem(SELECTED_SESSION_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStoredSelectedSessionId(sessionId: string | null) {
  if (typeof window === "undefined") return
  try {
    if (!sessionId) window.sessionStorage.removeItem(SELECTED_SESSION_STORAGE_KEY)
    else window.sessionStorage.setItem(SELECTED_SESSION_STORAGE_KEY, sessionId)
  } catch {
    // ignore storage failures
  }
}

function turnAssistantMessageId(turnId: string) {
  return `turn:${turnId}:assistant`
}

function turnToolMessageId(turnId: string, roundIndex: number, callIndex: number) {
  return `turn:${turnId}:tool:${roundIndex}:${callIndex}`
}

function turnToolStreamKey(turnId: string, roundIndex: number, callIndex: number) {
  return `${turnId}:${roundIndex}:${callIndex}`
}

function normalizeRole(value: string | undefined): SessionMessage["role"] {
  return value === "assistant" || value === "tool" || value === "system" ? value : "user"
}

function parsePersistedMessages(sessionId: string, payload: SessionDetailResponse) {
  return Array.isArray(payload.messages)
    ? payload.messages.map((item, index) => ({
        id: String(item.id ?? `${sessionId}-${index}`),
        role: normalizeRole(item.role),
        content: typeof item.content === "string" ? item.content : "",
        createdAt: item.created_at,
        toolName: item.tool_name,
        rawJson: item.raw_json,
        thinking: extractThinking(item.raw_json),
      }))
    : []
}

function sortMessages(messages: SessionMessage[]) {
  return [...messages].sort((left, right) => {
    const leftTime = left.createdAt ? Date.parse(left.createdAt) : Number.POSITIVE_INFINITY
    const rightTime = right.createdAt ? Date.parse(right.createdAt) : Number.POSITIVE_INFINITY
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
      return leftTime - rightTime
    }
    return left.id.localeCompare(right.id)
  })
}

function upsertMessage(messages: SessionMessage[], entry: SessionMessage) {
  const index = messages.findIndex((item) => item.id === entry.id)
  if (index === -1) return [...messages, entry]
  const next = [...messages]
  next[index] = {
    ...next[index],
    ...entry,
    rawJson: entry.rawJson === undefined ? next[index].rawJson : entry.rawJson,
    thinking: entry.thinking === undefined ? next[index].thinking : entry.thinking,
  }
  return next
}

function updateMessageById(
  messages: SessionMessage[],
  id: string,
  updater: (current: SessionMessage) => SessionMessage,
) {
  const index = messages.findIndex((item) => item.id === id)
  if (index === -1) return messages
  const next = [...messages]
  next[index] = updater(next[index])
  return next
}

function ensureAssistantMessage(
  messages: SessionMessage[],
  turnId: string,
  createdAt?: string,
  pending = true,
) {
  return upsertMessage(messages, {
    id: turnAssistantMessageId(turnId),
    turnId,
    role: "assistant",
    content: "",
    createdAt,
    thinking: null,
    pending,
  })
}

function compactToolSnapshotResult(entry: Record<string, unknown>) {
  const resultOk = entry.result_ok
  if (typeof resultOk === "boolean") {
    return resultOk ? "Tool call completed." : "Tool call finished with an unsuccessful result."
  }
  return entry.type === "tool_call_completed" ? "Tool call completed." : "Running tool call."
}

function applyToolSnapshotEvent(
  messages: SessionMessage[],
  turnId: string,
  entry: Record<string, unknown>,
): SessionMessage[] {
  const roundIndex = typeof entry.round_index === "number" ? entry.round_index : 0
  const callIndex = typeof entry.call_index === "number" ? entry.call_index : 0
  const id = turnToolMessageId(turnId, roundIndex, callIndex)
  return upsertMessage(messages, {
    id,
    turnId,
    role: "tool",
    content: compactToolSnapshotResult(entry),
    createdAt: typeof entry.created_at === "string" ? entry.created_at : undefined,
    toolName: typeof entry.tool_name === "string" ? entry.tool_name : "tool",
    rawJson: {
      arguments: typeof entry.arguments === "object" && entry.arguments ? entry.arguments : {},
      result_ok: entry.result_ok,
      source: entry.source,
      recovered: true,
    },
    pending: entry.type !== "tool_call_completed",
    streamKey: turnToolStreamKey(turnId, roundIndex, callIndex),
  })
}

function applyReplayEvent(
  messages: SessionMessage[],
  event: AgentStreamEvent,
  fallbackTurnId: string,
): SessionMessage[] {
  const turnId = event.turn_id || fallbackTurnId
  const payload = event.payload || {}
  const assistantId = turnAssistantMessageId(turnId)

  if (event.type === "turn_started") {
    return ensureAssistantMessage(messages, turnId, event.created_at, true)
  }

  if (event.type === "thinking_delta") {
    const delta = typeof payload.delta === "string" ? payload.delta : ""
    if (!delta) return messages
    const next = ensureAssistantMessage(messages, turnId, event.created_at, true)
    return updateMessageById(next, assistantId, (current) => ({
      ...current,
      thinking: `${current.thinking || ""}${delta}`,
      pending: true,
    }))
  }

  if (event.type === "assistant_delta") {
    const delta = typeof payload.delta === "string" ? payload.delta : ""
    if (!delta) return messages
    const next = ensureAssistantMessage(messages, turnId, event.created_at, true)
    return updateMessageById(next, assistantId, (current) => ({
      ...current,
      content: `${current.content}${delta}`,
      pending: true,
    }))
  }

  if (event.type === "assistant_reset") {
    const next = ensureAssistantMessage(messages, turnId, event.created_at, true)
    return updateMessageById(next, assistantId, (current) => ({
      ...current,
      content: "",
      thinking: null,
      pending: true,
    }))
  }

  if (event.type === "tool_call_started") {
    const roundIndex = typeof payload.round_index === "number" ? payload.round_index : 0
    const callIndex = typeof payload.call_index === "number" ? payload.call_index : 0
    return upsertMessage(messages, {
      id: turnToolMessageId(turnId, roundIndex, callIndex),
      turnId,
      role: "tool",
      content: "Running tool call.",
      createdAt: event.created_at,
      toolName: typeof payload.tool_name === "string" ? payload.tool_name : "tool",
      rawJson: { arguments: payload.arguments || {} },
      pending: true,
      streamKey: turnToolStreamKey(turnId, roundIndex, callIndex),
    })
  }

  if (event.type === "tool_call_completed") {
    const roundIndex = typeof payload.round_index === "number" ? payload.round_index : 0
    const callIndex = typeof payload.call_index === "number" ? payload.call_index : 0
    return upsertMessage(messages, {
      id: turnToolMessageId(turnId, roundIndex, callIndex),
      turnId,
      role: "tool",
      content: typeof payload.content === "string" ? payload.content : "Tool call completed.",
      createdAt: event.created_at,
      toolName: typeof payload.tool_name === "string" ? payload.tool_name : "tool",
      rawJson: {
        arguments: payload.arguments || {},
        result: payload.result || {},
      },
      pending: false,
      streamKey: turnToolStreamKey(turnId, roundIndex, callIndex),
    })
  }

  if (event.type === "turn_completed") {
    const result = payload.result as TurnResultPayload | undefined
    const next = ensureAssistantMessage(messages, turnId, event.created_at, false)
    return updateMessageById(next, assistantId, (current) => ({
      ...current,
      content: typeof result?.assistant_message === "string" ? result.assistant_message : current.content,
      thinking: typeof result?.thinking === "string" ? result.thinking : current.thinking,
      pending: false,
    }))
  }

  if (event.type === "turn_failed" || event.type === "turn_aborted") {
    const next = ensureAssistantMessage(messages, turnId, event.created_at, false)
    return updateMessageById(next, assistantId, (current) => ({
      ...current,
      content: current.content || (typeof payload.error === "string" ? payload.error : "Turn ended early."),
      pending: false,
    }))
  }

  return messages
}

function buildRecoveredMessages(
  baseMessages: SessionMessage[],
  turnId: string,
  snapshot: AgentTurnSnapshot,
  replayEvents: AgentStreamEvent[],
) {
  let nextMessages = baseMessages.filter(
    (item) => item.turnId !== turnId && !(item.streamKey && item.streamKey.startsWith(`${turnId}:`)),
  )

  const snapshotToolEvents = Array.isArray(snapshot.tool_state_json?.events)
    ? [...snapshot.tool_state_json.events].sort((left, right) => {
        const leftSeq = typeof left.sequence === "number" ? left.sequence : 0
        const rightSeq = typeof right.sequence === "number" ? right.sequence : 0
        return leftSeq - rightSeq
      })
    : []

  for (const entry of snapshotToolEvents) {
    nextMessages = applyToolSnapshotEvent(nextMessages, turnId, entry)
  }

  if (
    snapshot.assistant_content ||
    snapshot.thinking_content ||
    snapshotToolEvents.length > 0 ||
    replayEvents.length > 0
  ) {
    nextMessages = upsertMessage(nextMessages, {
      id: turnAssistantMessageId(turnId),
      turnId,
      role: "assistant",
      content: snapshot.assistant_content || "",
      createdAt: snapshot.updated_at || undefined,
      thinking: snapshot.thinking_content || null,
      pending: true,
    })
  }

  for (const event of replayEvents) {
    nextMessages = applyReplayEvent(nextMessages, event, turnId)
  }

  return sortMessages(nextMessages)
}

function inferTurnStatus(activeTurn: AgentActiveTurn | null, replayEvents: AgentStreamEvent[]) {
  if (activeTurn?.status) return activeTurn.status
  for (let index = replayEvents.length - 1; index >= 0; index -= 1) {
    const type = replayEvents[index]?.type
    if (type === "turn_completed") return "completed"
    if (type === "turn_failed") return "failed"
    if (type === "turn_aborted") return "aborted"
  }
  return null
}

function turnStatusLabel(status: string | null | undefined) {
  if (!status) return null
  if (status === "queued") return "Queued"
  if (status === "running") return "Running"
  if (status === "completed") return "Completed"
  if (status === "failed") return "Failed"
  if (status === "aborted") return "Aborted"
  return status
}

function turnStatusVariant(status: string | null | undefined): "secondary" | "outline" {
  if (status === "running") return "secondary"
  return "outline"
}

function MessageCard({ message }: { message: SessionMessage }) {
  const Icon = messageIcon(message.role)
  const roleLabel = message.role === "tool" ? message.toolName || "tool" : message.role

  return (
    <article
      className={cn(
        "rounded-2xl border p-4",
        message.role === "user" ? "border-foreground/15 bg-foreground text-background" : "bg-card/70",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border",
              message.role === "user" ? "border-background/20 bg-background/5" : "bg-background/50",
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium capitalize">{roleLabel}</div>
            <div className={cn("text-xs", message.role === "user" ? "text-background/70" : "text-muted-foreground")}>
              {formatDate(message.createdAt)}
            </div>
          </div>
        </div>

        {message.pending ? <Badge variant="secondary">Running</Badge> : null}
      </div>

      <MarkdownContent
        content={message.content || (message.pending ? "Working…" : "No content.")}
        inverted={message.role === "user"}
        className={cn("mt-3", message.role === "user" ? "text-background" : "text-foreground")}
      />

      {message.thinking ? (
        <details className="mt-3 rounded-xl border bg-background/40 p-3 text-sm">
          <summary className="cursor-pointer select-none font-medium">Thinking</summary>
          <pre className="mt-3 whitespace-pre-wrap text-xs text-muted-foreground">{message.thinking}</pre>
        </details>
      ) : null}

      {message.rawJson ? (
        <details className="mt-3 rounded-xl border bg-background/40 p-3 text-sm">
          <summary className="cursor-pointer select-none font-medium">Details</summary>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">{prettyJson(message.rawJson)}</pre>
        </details>
      ) : null}
    </article>
  )
}

type SessionListItemProps = {
  session: SessionSummary
  selected: boolean
  onSelect: (sessionId: string) => void
  onCopy: (sessionId: string) => void
}

function SessionListItem({ session, selected, onSelect, onCopy }: SessionListItemProps) {
  const label = session.title?.trim() || shortSessionId(session.session_id)

  return (
    <div
      className={cn(
        "group flex items-start gap-2 rounded-xl border px-2 py-2 transition-colors",
        selected ? "border-foreground/20 bg-accent/60" : "bg-background/40 hover:bg-accent/30",
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => onSelect(session.session_id)}
            className="min-w-0 flex-1 rounded-lg px-1 py-0.5 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <div className="truncate text-sm font-medium">{label}</div>
            <div className="mt-1 text-xs text-muted-foreground">{formatDate(session.updated_at)}</div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="max-w-xs">
          <div className="font-medium">{label}</div>
          <div className="mt-1 text-[11px] opacity-80">{session.session_id}</div>
        </TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="mt-0.5 rounded-lg opacity-70 transition group-hover:opacity-100"
                aria-label={`Session actions for ${label}`}
              >
                <Ellipsis className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">Session actions</TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="end" className="w-48 rounded-xl">
          <DropdownMenuItem onClick={() => onSelect(session.session_id)}>
            <Check className="h-4 w-4" />
            Open session
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onCopy(session.session_id)}>
            <Copy className="h-4 w-4" />
            Copy session ID
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function TurnFlagsSummary({
  flags,
  toolCount,
  onClear,
}: {
  flags: AgentTurnFlags
  toolCount: number
  onClear: () => void
}) {
  const hasFlags = Boolean(flags.target || flags.executionMode || (flags.confirmedTools?.length || 0) > 0)
  if (!hasFlags) return null

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border bg-card/40 px-3 py-2 text-xs text-muted-foreground">
      <Badge variant="secondary">Turn flags</Badge>
      {flags.target ? <Badge variant="outline">target:{flags.target}</Badge> : null}
      {flags.executionMode ? <Badge variant="outline">mode:{flags.executionMode}</Badge> : null}
      {toolCount > 0 ? <Badge variant="outline">tools:{toolCount}</Badge> : null}
      <button
        type="button"
        onClick={onClear}
        className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-accent"
      >
        <X className="h-3 w-3" />
        Clear
      </button>
    </div>
  )
}

function TurnFlagsPanel({
  flags,
  tools,
  loadingTools,
  onChange,
  onClose,
  onClear,
}: {
  flags: AgentTurnFlags
  tools: AgentToolDescriptor[]
  loadingTools: boolean
  onChange: (next: AgentTurnFlags) => void
  onClose: () => void
  onClear: () => void
}) {
  const toggleTool = (toolName: string) => {
    const current = new Set(flags.confirmedTools ?? [])
    if (current.has(toolName)) current.delete(toolName)
    else current.add(toolName)
    onChange({ ...flags, confirmedTools: [...current] })
  }

  return (
    <div className="mb-3 rounded-2xl border bg-card/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Slash-style turn flags</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Confirm a target, execution mode, or safe tool subset before this turn is proxied upstream.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" className="rounded-lg" onClick={onClear}>
            Clear
          </Button>
          <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
        <div className="space-y-3 rounded-xl border bg-background/50 p-3">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Target hint</label>
            <input
              value={flags.target || ""}
              onChange={(event) => onChange({ ...flags, target: event.target.value })}
              placeholder="seasonalweather, git repo, host…"
              className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/30"
            />
          </div>

          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Execution mode</div>
            <div className="mt-2 space-y-2">
              {EXECUTION_MODE_OPTIONS.map((option) => {
                const active = flags.executionMode === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...flags,
                        executionMode: active ? "" : option.value,
                      })
                    }
                    className={cn(
                      "w-full rounded-xl border px-3 py-2 text-left transition",
                      active ? "border-foreground/30 bg-accent/60" : "bg-background hover:bg-accent/30",
                    )}
                  >
                    <div className="text-sm font-medium">{option.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{option.description}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-background/50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Operator-confirmed tools</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Selected tools remain available for this turn. Unselected tools are not exposed from the web confirmation layer.
              </p>
            </div>
            <Badge variant="outline">{flags.confirmedTools?.length || 0} selected</Badge>
          </div>

          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
            {loadingTools ? (
              <div className="rounded-xl border px-3 py-4 text-sm text-muted-foreground">Loading tools…</div>
            ) : tools.length === 0 ? (
              <div className="rounded-xl border px-3 py-4 text-sm text-muted-foreground">No tool metadata was returned by Seasonal Agent.</div>
            ) : (
              tools.map((tool) => {
                const active = (flags.confirmedTools ?? []).includes(tool.name)
                return (
                  <button
                    key={tool.name}
                    type="button"
                    onClick={() => toggleTool(tool.name)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition",
                      active ? "border-foreground/30 bg-accent/60" : "bg-background hover:bg-accent/30",
                    )}
                  >
                    <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border bg-background">
                      {active ? <Check className="h-3.5 w-3.5" /> : null}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{tool.name}</div>
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {tool.description || "No description returned by the runtime."}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function AgentConsole() {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<SessionMessage[]>([])
  const [message, setMessage] = useState("")
  const [profileOverride, setProfileOverride] = useState("")
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [statusLabel, setStatusLabel] = useState("Checking agent")
  const [healthOk, setHealthOk] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmNewChatOpen, setConfirmNewChatOpen] = useState(false)
  const [turnFlagsOpen, setTurnFlagsOpen] = useState(false)
  const [turnFlags, setTurnFlags] = useState<AgentTurnFlags>({
    target: "",
    executionMode: "",
    confirmedTools: [],
  })
  const [availableTools, setAvailableTools] = useState<AgentToolDescriptor[]>([])
  const [loadingTools, setLoadingTools] = useState(true)
  const [activeTurn, setActiveTurn] = useState<AgentActiveTurn | null>(null)
  const [reconnecting, setReconnecting] = useState(false)
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const transcriptRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const pollingRef = useRef<number | null>(null)

  const notifyError = useCallback((title: string, description?: string) => {
    toast.error(title, {
      description,
      duration: 6000,
    })
  }, [])

  const refreshSessions = useCallback(
    async ({ preferredSessionId, includeHealth = true }: RefreshSessionsOptions = {}) => {
      setLoadingSessions(true)
      try {
        const sessionsRes = await fetch("/api/agent/sessions?limit=40", { cache: "no-store" })
        const sessionsJson = await parseJsonResponse<{ sessions?: SessionSummary[]; error?: string }>(
          sessionsRes,
          "Failed to load sessions.",
        )

        if (!sessionsRes.ok) {
          throw new Error(sessionsJson.error || "Failed to load sessions.")
        }

        const nextSessions = Array.isArray(sessionsJson.sessions) ? sessionsJson.sessions : []
        setSessions(nextSessions)

        if (includeHealth) {
          const healthRes = await fetch("/api/agent/health", { cache: "no-store" })
          const healthJson = await parseJsonResponse<{ ok?: boolean; error?: string }>(
            healthRes,
            "Failed to load health status.",
          )
          const isHealthy = healthRes.ok && Boolean(healthJson.ok)

          setHealthOk(isHealthy)
          setStatusLabel(isHealthy ? "Agent reachable" : "Agent degraded")

          if (!isHealthy) {
            const description =
              typeof healthJson.error === "string"
                ? healthJson.error
                : "Health checks did not return an OK state."
            notifyError("Seasonal Agent is degraded.", description)
          }
        }

        const storedSessionId = readStoredSelectedSessionId()
        setSelectedSessionId((current) => {
          const requested = preferredSessionId !== undefined ? preferredSessionId : current || storedSessionId
          if (requested && nextSessions.some((session) => session.session_id === requested)) {
            return requested
          }
          return nextSessions[0]?.session_id || null
        })
      } catch (err) {
        const nextError = err instanceof Error ? err.message : "Failed to load agent UI data."
        setError(nextError)
        setHealthOk(false)
        setStatusLabel("Agent unavailable")
        notifyError("Failed to load agent UI.", nextError)
      } finally {
        setLoadingSessions(false)
      }
    },
    [notifyError],
  )

  const loadTools = useCallback(async () => {
    setLoadingTools(true)
    try {
      const response = await fetch("/api/agent/tools", { cache: "no-store" })
      const json = await parseJsonResponse<ToolsResponse>(response, "Failed to load tool metadata.")
      if (!response.ok) {
        throw new Error(json.error || "Failed to load tool metadata.")
      }
      setAvailableTools(Array.isArray(json.tools) ? json.tools : [])
    } catch (err) {
      const nextError = err instanceof Error ? err.message : "Failed to load tool metadata."
      notifyError("Failed to load tool metadata.", nextError)
      setAvailableTools([])
    } finally {
      setLoadingTools(false)
    }
  }, [notifyError])

  const loadSessionState = useCallback(
    async (sessionId: string, options: RecoveryLoadOptions = {}) => {
      if (!options.silent) setLoadingMessages(true)
      setError(null)
      try {
        const [sessionRes, activeTurnRes] = await Promise.all([
          fetch(`/api/agent/sessions/${encodeURIComponent(sessionId)}?limit=100`, { cache: "no-store" }),
          fetch(`/api/agent/sessions/${encodeURIComponent(sessionId)}/active-turn`, { cache: "no-store" }),
        ])

        const [sessionJson, activeTurnJson] = await Promise.all([
          parseJsonResponse<SessionDetailResponse>(sessionRes, "Failed to load session messages."),
          parseJsonResponse<ActiveTurnResponse>(activeTurnRes, "Failed to load active turn metadata."),
        ])

        if (!sessionRes.ok) {
          throw new Error(sessionJson.error || "Failed to load session messages.")
        }
        const persistedMessages = parsePersistedMessages(sessionId, sessionJson)
        const upstreamActiveTurn = activeTurnRes.ok
          ? activeTurnJson.active_turn || sessionJson.active_turn || null
          : activeTurnRes.status === 404
            ? sessionJson.active_turn || null
            : (() => {
                throw new Error(activeTurnJson.error || "Failed to load active turn metadata.")
              })()
        const recoveryTurnId = upstreamActiveTurn?.turn_id || options.recoveryTurnId || null

        if (!recoveryTurnId) {
          setMessages(sortMessages(persistedMessages))
          setActiveTurn(null)
          setReconnecting(false)
          setRecoveryNotice(null)
          return
        }

        setReconnecting(Boolean(!sending))

        const snapshotRes = await fetch(
          `/api/agent/turns/${encodeURIComponent(recoveryTurnId)}/snapshot?session_id=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" },
        )
        const snapshotJson = await parseJsonResponse<TurnSnapshotResponse>(snapshotRes, "Failed to load durable turn snapshot.")

        if (!snapshotRes.ok) {
          if (snapshotRes.status === 404) {
            setMessages(sortMessages(persistedMessages))
            setActiveTurn(upstreamActiveTurn)
            setReconnecting(Boolean(upstreamActiveTurn && !sending))
            setRecoveryNotice(upstreamActiveTurn ? "Active turn metadata was present, but no durable snapshot was available yet." : null)
            return
          }
          throw new Error(snapshotJson.error || "Failed to load durable turn snapshot.")
        }

        const snapshot = snapshotJson.snapshot
        if (!snapshot) {
          setMessages(sortMessages(persistedMessages))
          setActiveTurn(upstreamActiveTurn)
          setReconnecting(Boolean(upstreamActiveTurn && !sending))
          return
        }

        const eventsRes = await fetch(
          `/api/agent/turns/${encodeURIComponent(recoveryTurnId)}/events?session_id=${encodeURIComponent(sessionId)}&after_sequence=${encodeURIComponent(String(snapshot.last_sequence || 0))}`,
          { cache: "no-store" },
        )
        const eventsJson = await parseJsonResponse<TurnEventsResponse>(eventsRes, "Failed to replay missed turn events.")
        if (!eventsRes.ok) {
          throw new Error(eventsJson.error || "Failed to replay missed turn events.")
        }

        const replayEvents = Array.isArray(eventsJson.events) ? eventsJson.events : []
        const rebuiltMessages = buildRecoveredMessages(persistedMessages, recoveryTurnId, snapshot, replayEvents)
        const inferredStatus = inferTurnStatus(upstreamActiveTurn, replayEvents)
        const nextTurn = upstreamActiveTurn
          ? upstreamActiveTurn
          : {
              turn_id: recoveryTurnId,
              session_id: sessionId,
              status: inferredStatus || "aborted",
              updated_at: snapshot.updated_at,
              snapshot_last_sequence: snapshot.last_sequence,
            }

        setMessages(rebuiltMessages)
        setActiveTurn(nextTurn)
        setReconnecting(Boolean(nextTurn.status === "queued" || nextTurn.status === "running") && !sending)
        setRecoveryNotice(
          nextTurn.status === "queued" || nextTurn.status === "running"
            ? "Recovered the latest durable turn state and will keep checking for updates."
            : "Recovered the latest durable turn state after the stream was interrupted.",
        )
      } catch (err) {
        const nextError = err instanceof Error ? err.message : "Failed to load messages."
        setError(nextError)
        setMessages([])
        setActiveTurn(null)
        setReconnecting(false)
        notifyError("Failed to load conversation.", nextError)
      } finally {
        if (!options.silent) setLoadingMessages(false)
      }
    },
    [notifyError, sending],
  )

  useEffect(() => {
    void refreshSessions()
    void loadTools()
  }, [loadTools, refreshSessions])

  useEffect(() => {
    writeStoredSelectedSessionId(selectedSessionId)
  }, [selectedSessionId])

  useEffect(() => {
    if (!selectedSessionId) {
      setMessages([])
      setActiveTurn(null)
      setReconnecting(false)
      setRecoveryNotice(null)
      return
    }

    void loadSessionState(selectedSessionId)
  }, [loadSessionState, selectedSessionId])

  useEffect(() => {
    const el = transcriptRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return

    el.style.height = "0px"
    const nextHeight = Math.min(Math.max(el.scrollHeight, 88), 224)
    el.style.height = `${nextHeight}px`
    el.style.overflowY = el.scrollHeight > 224 ? "auto" : "hidden"
  }, [message])

  useEffect(() => {
    if (message.trim() === "/") {
      setMessage("")
      setTurnFlagsOpen(true)
    }
  }, [message])

  useEffect(() => {
    if (pollingRef.current !== null) {
      window.clearInterval(pollingRef.current)
      pollingRef.current = null
    }

    if (
      typeof window === "undefined" ||
      sending ||
      !selectedSessionId ||
      !activeTurn ||
      (activeTurn.status !== "queued" && activeTurn.status !== "running")
    ) {
      return
    }

    pollingRef.current = window.setInterval(() => {
      void loadSessionState(selectedSessionId, {
        recoveryTurnId: activeTurn.turn_id,
        silent: true,
      })
    }, 1500)

    return () => {
      if (pollingRef.current !== null) {
        window.clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [activeTurn, loadSessionState, selectedSessionId, sending])

  const sessionHeading = useMemo(() => {
    if (!selectedSessionId) return "New chat"
    return shortSessionId(selectedSessionId)
  }, [selectedSessionId])

  const hasConversationState = messages.length > 0 || Boolean(message.trim())
  const confirmedToolCount = turnFlags.confirmedTools?.length || 0

  const updateMessage = useCallback((id: string, updater: (current: SessionMessage) => SessionMessage) => {
    setMessages((current) => updateMessageById(current, id, updater))
  }, [])

  const appendMessage = useCallback((entry: SessionMessage) => {
    setMessages((current) => [...current, entry])
  }, [])

  const clearTurnFlags = useCallback(() => {
    setTurnFlags({ target: "", executionMode: "", confirmedTools: [] })
  }, [])

  const handleNewChat = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setSelectedSessionId(null)
    setMessages([])
    setActiveTurn(null)
    setReconnecting(false)
    setRecoveryNotice(null)
    setError(null)
    setConfirmNewChatOpen(false)
    toast.success("Started a new chat.")
  }, [])

  const requestNewChat = useCallback(() => {
    if (sending || hasConversationState) {
      setConfirmNewChatOpen(true)
      return
    }

    handleNewChat()
  }, [handleNewChat, hasConversationState, sending])

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setSending(false)
    toast.info("Stopped the active request.")
  }, [])

  const copySessionId = useCallback(
    async (sessionId: string) => {
      try {
        await navigator.clipboard.writeText(sessionId)
        toast.success("Session ID copied.", {
          description: sessionId,
        })
      } catch {
        notifyError("Failed to copy session ID.", "The browser clipboard API was unavailable.")
      }
    },
    [notifyError],
  )

  const handleSubmit = useCallback(async () => {
    const trimmed = message.trim()
    if (!trimmed || sending) return

    setError(null)
    setSending(true)
    setReconnecting(false)
    setRecoveryNotice(null)

    const controller = new AbortController()
    abortRef.current = controller

    const userMessageId = `user-${crypto.randomUUID()}`
    const assistantMessageId = `assistant-${crypto.randomUUID()}`

    appendMessage({
      id: userMessageId,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    })
    appendMessage({
      id: assistantMessageId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      thinking: null,
      pending: true,
    })
    setMessage("")

    try {
      const webContext: AgentTurnFlags | undefined =
        turnFlags.target || turnFlags.executionMode || (turnFlags.confirmedTools?.length || 0) > 0
          ? {
              target: turnFlags.target?.trim() || undefined,
              executionMode: turnFlags.executionMode || undefined,
              confirmedTools: turnFlags.confirmedTools?.length ? turnFlags.confirmedTools : undefined,
            }
          : undefined

      const response = await fetch("/api/agent/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          session_id: selectedSessionId || undefined,
          persist_history: true,
          agent_profile: profileOverride.trim() || undefined,
          web_context: webContext,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const failure = await parseJsonResponse<{ error?: string }>(response, "Stream request failed.")
        throw new Error(typeof failure.error === "string" ? failure.error : "Stream request failed.")
      }

      if (!response.body) {
        throw new Error("Streaming response body was empty.")
      }

      const decoder = new TextDecoder()
      const reader = response.body.getReader()
      let buffer = ""
      let completedSessionId = selectedSessionId
      let streamTurnId: string | null = null
      let sawTerminalEvent = false

      const processEvent = (event: AgentStreamEvent) => {
        const payload = event.payload || {}
        if (event.turn_id) streamTurnId = event.turn_id

        if (typeof event.sequence === "number" && streamTurnId) {
          setActiveTurn((current) =>
            current && current.turn_id === streamTurnId
              ? { ...current, snapshot_last_sequence: event.sequence, updated_at: event.created_at }
              : current,
          )
        }

        if (event.type === "turn_started") {
          const sessionId = typeof payload.session_id === "string" ? payload.session_id : event.session_id
          completedSessionId = sessionId
          setSelectedSessionId(sessionId)
          if (streamTurnId) {
            setActiveTurn({
              turn_id: streamTurnId,
              session_id: sessionId,
              status: "running",
              profile_id: typeof payload.profile_id === "string" ? payload.profile_id : profileOverride.trim() || null,
              started_at: event.created_at,
              updated_at: event.created_at,
              snapshot_last_sequence: event.sequence,
            })
          }
          return
        }

        if (event.type === "thinking_delta") {
          const delta = typeof payload.delta === "string" ? payload.delta : ""
          if (!delta) return
          updateMessage(assistantMessageId, (current) => ({
            ...current,
            thinking: `${current.thinking || ""}${delta}`,
          }))
          return
        }

        if (event.type === "assistant_delta") {
          const delta = typeof payload.delta === "string" ? payload.delta : ""
          if (!delta) return
          updateMessage(assistantMessageId, (current) => ({
            ...current,
            content: `${current.content}${delta}`,
          }))
          return
        }

        if (event.type === "assistant_reset") {
          updateMessage(assistantMessageId, (current) => ({
            ...current,
            content: "",
            thinking: null,
          }))
          return
        }

        if (event.type === "tool_call_started") {
          const roundIndex = typeof payload.round_index === "number" ? payload.round_index : 0
          const callIndex = typeof payload.call_index === "number" ? payload.call_index : 0
          appendMessage({
            id: `tool-${crypto.randomUUID()}`,
            turnId: streamTurnId || undefined,
            role: "tool",
            content: "Running tool call.",
            createdAt: event.created_at,
            toolName: typeof payload.tool_name === "string" ? payload.tool_name : "tool",
            rawJson: { arguments: payload.arguments || {} },
            pending: true,
            streamKey: streamTurnId ? turnToolStreamKey(streamTurnId, roundIndex, callIndex) : `${roundIndex}:${callIndex}`,
          })
          return
        }

        if (event.type === "tool_call_completed") {
          const roundIndex = typeof payload.round_index === "number" ? payload.round_index : 0
          const callIndex = typeof payload.call_index === "number" ? payload.call_index : 0
          const streamKey = streamTurnId ? turnToolStreamKey(streamTurnId, roundIndex, callIndex) : `${roundIndex}:${callIndex}`
          setMessages((current) =>
            current.map((item) =>
              item.streamKey === streamKey
                ? {
                    ...item,
                    content: typeof payload.content === "string" ? payload.content : item.content,
                    rawJson: {
                      arguments: payload.arguments || {},
                      result: payload.result || {},
                    },
                    pending: false,
                  }
                : item,
            ),
          )
          return
        }

        if (event.type === "turn_completed") {
          sawTerminalEvent = true
          const result = payload.result as TurnResultPayload | undefined
          updateMessage(assistantMessageId, (current) => ({
            ...current,
            content:
              typeof result?.assistant_message === "string"
                ? result.assistant_message
                : current.content,
            thinking: typeof result?.thinking === "string" ? result.thinking : current.thinking,
            pending: false,
          }))
          if (typeof result?.session_id === "string") {
            completedSessionId = result.session_id
            setSelectedSessionId(result.session_id)
          }
          if (streamTurnId) {
            setActiveTurn((current) =>
              current && current.turn_id === streamTurnId
                ? { ...current, status: "completed", completed_at: event.created_at, updated_at: event.created_at }
                : current,
            )
          }
          return
        }

        if (event.type === "turn_failed" || event.type === "turn_aborted") {
          sawTerminalEvent = true
          const nextError = typeof payload.error === "string" ? payload.error : "Turn failed."
          updateMessage(assistantMessageId, (current) => ({
            ...current,
            content: current.content || nextError,
            pending: false,
          }))
          if (event.type === "turn_failed") {
            setError(nextError)
            notifyError("Seasonal Agent failed the turn.", nextError)
          }
          if (streamTurnId) {
            setActiveTurn((current) =>
              current && current.turn_id === streamTurnId
                ? {
                    ...current,
                    status: event.type === "turn_aborted" ? "aborted" : "failed",
                    error_message: nextError,
                    completed_at: event.created_at,
                    updated_at: event.created_at,
                  }
                : current,
            )
          }
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          buffer += decoder.decode()
          break
        }

        buffer += decoder.decode(value, { stream: true })
        buffer = consumeSseBuffer(buffer, processEvent)
      }

      buffer = consumeSseBuffer(buffer, processEvent, { flushRemainder: true })

      await refreshSessions({
        preferredSessionId: completedSessionId,
        includeHealth: false,
      })

      if (!sawTerminalEvent && streamTurnId && completedSessionId) {
        await loadSessionState(completedSessionId, {
          recoveryTurnId: streamTurnId,
          silent: true,
        })
        toast.info("Recovered the latest durable turn state.", {
          description: "The live stream ended early, but the backend snapshot was restored.",
        })
      }
    } catch (err) {
      const nextError = err instanceof Error ? err.message : "Chat request failed."
      const recoverySessionId = selectedSessionId

      if (controller.signal.aborted) {
        updateMessage(assistantMessageId, (current) => ({
          ...current,
          content: current.content || "Request stopped.",
          pending: false,
        }))
      } else {
        setError(nextError)
        updateMessage(assistantMessageId, (current) => ({
          ...current,
          content: current.content || nextError,
          pending: false,
        }))
        notifyError("Chat request failed.", nextError)
      }

      if (recoverySessionId) {
        await refreshSessions({
          preferredSessionId: recoverySessionId,
          includeHealth: false,
        })
        await loadSessionState(recoverySessionId, { silent: true })
      }
    } finally {
      abortRef.current = null
      setSending(false)
    }
  }, [
    appendMessage,
    loadSessionState,
    message,
    notifyError,
    profileOverride,
    refreshSessions,
    selectedSessionId,
    sending,
    turnFlags,
    updateMessage,
  ])

  const currentTurnStatus = turnStatusLabel(activeTurn?.status)

  return (
    <TooltipProvider delayDuration={150}>
      <>
        <div className="grid h-full min-h-0 w-full grid-cols-1 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-hidden border-r bg-card/20">
            <div className="flex h-full min-h-0 flex-col">
              <div className="px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold">Sessions</h2>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant={healthOk ? "secondary" : "outline"} className="cursor-default">
                        {statusLabel}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {healthOk
                        ? "The Seasonal Agent API responded to health checks."
                        : "The Seasonal Agent API is degraded or unavailable."}
                    </TooltipContent>
                  </Tooltip>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button className="mt-4 w-full rounded-xl" variant="outline" onClick={requestNewChat}>
                      <Plus className="mr-2 h-4 w-4" />
                      New chat
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Reset the active canvas and start a fresh conversation.</TooltipContent>
                </Tooltip>
              </div>

              <Separator />

              <div className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Profile override</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="cursor-default text-[10px] uppercase">
                        Optional
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      Leave blank to use the server default profile.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <input
                  value={profileOverride}
                  onChange={(event) => setProfileOverride(event.target.value)}
                  placeholder="homelab, seasonalnet, repo…"
                  className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/30"
                />
                <p className="mt-2 text-xs text-muted-foreground">Leave blank to use the server default profile.</p>
              </div>

              <Separator />

              <div className="min-h-0 flex-1 overflow-hidden px-3 py-3">
                <div className="h-full space-y-2 overflow-y-auto pr-1">
                  {loadingSessions ? (
                    <div className="rounded-xl border bg-background/50 px-3 py-4 text-sm text-muted-foreground">Loading sessions…</div>
                  ) : sessions.length === 0 ? (
                    <div className="rounded-xl border bg-background/50 px-3 py-4 text-sm text-muted-foreground">No saved sessions yet. Start a new chat.</div>
                  ) : (
                    sessions.map((session) => (
                      <SessionListItem
                        key={session.session_id}
                        session={session}
                        selected={selectedSessionId === session.session_id}
                        onSelect={setSelectedSessionId}
                        onCopy={(sessionId) => void copySessionId(sessionId)}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </aside>

          <section className="min-h-0 overflow-hidden">
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b px-5 py-4">
                <div className="mx-auto flex w-full max-w-4xl items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Seasonal Agent</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      One conversation canvas, one composer, and structured tool output over the local runtime API.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {currentTurnStatus ? (
                        <Badge variant={turnStatusVariant(activeTurn?.status)}>{currentTurnStatus}</Badge>
                      ) : null}
                      {reconnecting ? <Badge variant="outline">Reconnecting…</Badge> : null}
                      {activeTurn?.turn_id ? (
                        <Badge variant="outline">turn:{shortSessionId(activeTurn.turn_id)}</Badge>
                      ) : null}
                    </div>
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="rounded-xl border bg-background/50 px-3 py-2 text-right">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Current session</div>
                        <div className="mt-1 text-sm font-medium">{sessionHeading}</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      {selectedSessionId || "No persisted session yet. The next turn will create one."}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden">
                <div ref={transcriptRef} className="h-full min-h-0 overflow-y-auto px-4 py-4 md:px-5">
                  <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-end gap-3">
                    {recoveryNotice ? (
                      <div className="w-full rounded-xl border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
                        {recoveryNotice}
                      </div>
                    ) : null}
                    {loadingMessages ? (
                      <div className="w-full rounded-xl border bg-card/60 px-4 py-6 text-sm text-muted-foreground">Loading conversation…</div>
                    ) : messages.length === 0 ? (
                      <div className="w-full rounded-xl border bg-card/60 px-4 py-6 text-sm text-muted-foreground">No messages yet. Ask Seasonal Agent something operational.</div>
                    ) : (
                      messages.map((entry) => (
                        <div key={entry.id} className="w-full">
                          <MessageCard message={entry} />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 md:px-5">
                <div className="mx-auto w-full max-w-4xl rounded-xl bg-background/40 p-3">
                  {turnFlagsOpen ? (
                    <TurnFlagsPanel
                      flags={turnFlags}
                      tools={availableTools}
                      loadingTools={loadingTools}
                      onChange={setTurnFlags}
                      onClose={() => setTurnFlagsOpen(false)}
                      onClear={clearTurnFlags}
                    />
                  ) : null}

                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    onKeyDown={(event) => {
                      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                        event.preventDefault()
                        void handleSubmit()
                      }
                    }}
                    placeholder="Ask Seasonal Agent something real. Type / to open turn flags. Ctrl+Enter sends."
                    className="min-h-[5.5rem] max-h-56 w-full resize-none rounded-xl border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
                  />

                  <TurnFlagsSummary flags={turnFlags} toolCount={confirmedToolCount} onClear={clearTurnFlags} />

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground">
                      The browser talks only to this app. The app derives caller identity from Authentik, proxies to Seasonal Agent with the server-side token, and scopes sessions per signed-in operator.
                    </div>

                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => setTurnFlagsOpen((current) => !current)}
                          >
                            <Command className="mr-2 h-4 w-4" />
                            Turn flags
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Open the slash-style turn flag menu above the composer.</TooltipContent>
                      </Tooltip>

                      {sending ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button type="button" variant="outline" className="rounded-xl" onClick={handleStop}>
                              <Square className="mr-2 h-4 w-4" />
                              Stop
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Abort the active streamed turn.</TooltipContent>
                        </Tooltip>
                      ) : null}

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="button" className="rounded-xl" onClick={() => void handleSubmit()} disabled={!message.trim() || sending}>
                            {sending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Send
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Send with the current profile override, turn flags, and persisted per-user session state.</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {error ? (
                    <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        </div>

        <AlertDialog open={confirmNewChatOpen} onOpenChange={setConfirmNewChatOpen}>
          {confirmNewChatOpen ? (
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Start a new chat?</AlertDialogTitle>
                <AlertDialogDescription>
                  This clears the active canvas and draft text in the browser. Saved sessions remain available in the rail.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                <AlertDialogAction className="rounded-xl" onClick={handleNewChat}>
                  Start new chat
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          ) : null}
        </AlertDialog>
      </>
    </TooltipProvider>
  )
}
