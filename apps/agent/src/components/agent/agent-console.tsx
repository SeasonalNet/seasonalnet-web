"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Activity, Bot, LoaderCircle, MessageSquare, Plus, Send, Square, Wrench } from "lucide-react"

import { Badge } from "@seasonalnet/shell/src/components/ui/badge"
import { Button } from "@seasonalnet/shell/src/components/ui/button"
import { Separator } from "@seasonalnet/shell/src/components/ui/separator"
import { cn } from "@seasonalnet/shell/src/lib/utils"

type SessionSummary = {
  session_id: string
  created_at: string
  updated_at: string
  title: string | null
}

type SessionMessage = {
  id: string
  role: "user" | "assistant" | "tool" | "system"
  content: string
  createdAt?: string
  toolName?: string | null
  rawJson?: unknown
  thinking?: string | null
  pending?: boolean
  streamKey?: string
}

type AgentStreamEvent = {
  type: string
  sequence: number
  created_at: string
  session_id: string
  payload: Record<string, unknown>
}

type TurnResultPayload = {
  session_id: string
  assistant_message: string
  thinking?: string | null
}

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

function MessageCard({ message }: { message: SessionMessage }) {
  const Icon = messageIcon(message.role)
  const roleLabel = message.role === "tool" ? message.toolName || "tool" : message.role

  return (
    <article
      className={cn(
        "rounded-2xl border p-4",
        message.role === "user"
          ? "border-foreground/15 bg-foreground text-background"
          : "bg-card/70",
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

      <div className={cn("mt-3 whitespace-pre-wrap text-sm leading-6", message.role === "user" ? "text-background" : "text-foreground")}>
        {message.content || (message.pending ? "Working…" : "No content.")}
      </div>

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
  const abortRef = useRef<AbortController | null>(null)
  const transcriptRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const refreshSessions = useCallback(async (preferredSessionId?: string | null) => {
    setLoadingSessions(true)
    try {
      const [sessionsRes, healthRes] = await Promise.all([
        fetch("/api/agent/sessions?limit=40", { cache: "no-store" }),
        fetch("/api/agent/health", { cache: "no-store" }),
      ])

      const sessionsJson = (await sessionsRes.json()) as { sessions?: SessionSummary[]; error?: string }
      const healthJson = (await healthRes.json()) as { ok?: boolean; error?: string }

      if (!sessionsRes.ok) {
        throw new Error(sessionsJson.error || "Failed to load sessions.")
      }

      setSessions(Array.isArray(sessionsJson.sessions) ? sessionsJson.sessions : [])
      setHealthOk(Boolean(healthJson.ok))
      setStatusLabel(healthJson.ok ? "Agent reachable" : "Agent degraded")

      setSelectedSessionId((current) => {
        if (preferredSessionId !== undefined) return preferredSessionId
        if (current) return current
        return sessionsJson.sessions?.[0]?.session_id || null
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load agent UI data."
      setError(message)
      setHealthOk(false)
      setStatusLabel("Agent unavailable")
    } finally {
      setLoadingSessions(false)
    }
  }, [])

  const loadMessages = useCallback(async (sessionId: string) => {
    setLoadingMessages(true)
    setError(null)
    try {
      const response = await fetch(`/api/agent/sessions/${encodeURIComponent(sessionId)}?limit=100`, {
        cache: "no-store",
      })
      const json = (await response.json()) as {
        ok?: boolean
        messages?: Array<{
          id?: number | string
          role?: string
          content?: string
          created_at?: string
          tool_name?: string | null
          raw_json?: unknown
        }>
        error?: string
      }

      if (!response.ok) {
        throw new Error(json.error || "Failed to load session messages.")
      }

      const nextMessages = Array.isArray(json.messages)
        ? json.messages.map((item, index) => ({
            id: String(item.id ?? `${sessionId}-${index}`),
            role: (item.role === "assistant" || item.role === "tool" || item.role === "system" ? item.role : "user") as SessionMessage["role"],
            content: typeof item.content === "string" ? item.content : "",
            createdAt: item.created_at,
            toolName: item.tool_name,
            rawJson: item.raw_json,
            thinking: extractThinking(item.raw_json),
          }))
        : []

      setMessages(nextMessages)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load messages."
      setError(message)
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  useEffect(() => {
    void refreshSessions()
  }, [refreshSessions])

  useEffect(() => {
    if (!selectedSessionId) {
      setMessages([])
      return
    }

    void loadMessages(selectedSessionId)
  }, [loadMessages, selectedSessionId])

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

  const sessionHeading = useMemo(() => {
    if (!selectedSessionId) return "New chat"
    return shortSessionId(selectedSessionId)
  }, [selectedSessionId])

  const updateMessage = useCallback((id: string, updater: (current: SessionMessage) => SessionMessage) => {
    setMessages((current) => current.map((item) => (item.id === id ? updater(item) : item)))
  }, [])

  const appendMessage = useCallback((entry: SessionMessage) => {
    setMessages((current) => [...current, entry])
  }, [])

  const handleNewChat = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setSelectedSessionId(null)
    setMessages([])
    setError(null)
  }, [])

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setSending(false)
  }, [])

  const handleSubmit = useCallback(async () => {
    const trimmed = message.trim()
    if (!trimmed || sending) return

    setError(null)
    setSending(true)

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
      const response = await fetch("/api/agent/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          session_id: selectedSessionId || undefined,
          persist_history: true,
          agent_profile: profileOverride.trim() || undefined,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const failure = await response.json().catch(() => ({ error: "Stream request failed." }))
        throw new Error(typeof failure.error === "string" ? failure.error : "Stream request failed.")
      }

      if (!response.body) {
        throw new Error("Streaming response body was empty.")
      }

      const decoder = new TextDecoder()
      const reader = response.body.getReader()
      let buffer = ""

      const processEvent = (event: AgentStreamEvent) => {
        const payload = event.payload || {}

        if (event.type === "turn_started") {
          const sessionId = typeof payload.session_id === "string" ? payload.session_id : event.session_id
          setSelectedSessionId(sessionId)
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
          const streamKey = `${roundIndex}:${callIndex}`
          appendMessage({
            id: `tool-${crypto.randomUUID()}`,
            role: "tool",
            content: "Running tool call.",
            createdAt: event.created_at,
            toolName: typeof payload.tool_name === "string" ? payload.tool_name : "tool",
            rawJson: { arguments: payload.arguments || {} },
            pending: true,
            streamKey,
          })
          return
        }

        if (event.type === "tool_call_completed") {
          const roundIndex = typeof payload.round_index === "number" ? payload.round_index : 0
          const callIndex = typeof payload.call_index === "number" ? payload.call_index : 0
          const streamKey = `${roundIndex}:${callIndex}`
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
          const result = payload.result as TurnResultPayload | undefined
          updateMessage(assistantMessageId, (current) => ({
            ...current,
            content: typeof result?.assistant_message === "string" ? result.assistant_message : current.content,
            thinking: typeof result?.thinking === "string" ? result.thinking : current.thinking,
            pending: false,
          }))
          if (typeof result?.session_id === "string") {
            setSelectedSessionId(result.session_id)
            void refreshSessions(result.session_id)
          } else {
            void refreshSessions()
          }
          return
        }

        if (event.type === "turn_failed") {
          const errorMessage = typeof payload.error === "string" ? payload.error : "Turn failed."
          updateMessage(assistantMessageId, (current) => ({
            ...current,
            content: errorMessage,
            pending: false,
          }))
          setError(errorMessage)
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        while (true) {
          const markerIndex = buffer.indexOf("\n\n")
          if (markerIndex === -1) break

          const rawEvent = buffer.slice(0, markerIndex)
          buffer = buffer.slice(markerIndex + 2)

          const lines = rawEvent.split(/\r?\n/)
          const dataLines: string[] = []

          for (const line of lines) {
            if (line.startsWith("data:")) {
              dataLines.push(line.slice(5).trimStart())
            }
          }

          if (!dataLines.length) continue

          try {
            processEvent(JSON.parse(dataLines.join("\n")) as AgentStreamEvent)
          } catch {
            // ignore malformed chunks from an already failed stream
          }
        }
      }
    } catch (err) {
      if (controller.signal.aborted) {
        updateMessage(assistantMessageId, (current) => ({
          ...current,
          content: current.content || "Request stopped.",
          pending: false,
        }))
      } else {
        const message = err instanceof Error ? err.message : "Chat request failed."
        setError(message)
        updateMessage(assistantMessageId, (current) => ({
          ...current,
          content: current.content || message,
          pending: false,
        }))
      }
    } finally {
      abortRef.current = null
      setSending(false)
    }
  }, [appendMessage, message, profileOverride, refreshSessions, selectedSessionId, sending, updateMessage])

  return (
    <div className="grid h-full min-h-0 w-full grid-cols-1 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="min-h-0 overflow-hidden border-r bg-card/20">
        <div className="flex h-full min-h-0 flex-col">
          <div className="border-b px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Sessions</h2>
              <Badge variant={healthOk ? "secondary" : "outline"}>{statusLabel}</Badge>
            </div>

            <Button className="mt-4 w-full rounded-xl" variant="outline" onClick={handleNewChat}>
              <Plus className="mr-2 h-4 w-4" />
              New chat
            </Button>
          </div>

          <div className="border-b px-4 py-4">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Profile override</label>
            <input
              value={profileOverride}
              onChange={(event) => setProfileOverride(event.target.value)}
              placeholder="homelab, seasonalnet, repo…"
              className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/30"
            />
            <p className="mt-2 text-xs text-muted-foreground">Leave blank to use the server default profile.</p>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden px-3 py-3">
            <div className="h-full space-y-2 overflow-y-auto pr-1">
              {loadingSessions ? (
                <div className="rounded-xl border bg-background/50 px-3 py-4 text-sm text-muted-foreground">Loading sessions…</div>
              ) : sessions.length === 0 ? (
                <div className="rounded-xl border bg-background/50 px-3 py-4 text-sm text-muted-foreground">No saved sessions yet. Start a new chat.</div>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.session_id}
                    type="button"
                    onClick={() => setSelectedSessionId(session.session_id)}
                    className={cn(
                      "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
                      selectedSessionId === session.session_id
                        ? "border-foreground/20 bg-accent/60"
                        : "bg-background/40 hover:bg-accent/30",
                    )}
                  >
                    <div className="text-sm font-medium">{session.title?.trim() || shortSessionId(session.session_id)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{formatDate(session.updated_at)}</div>
                  </button>
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
              </div>

              <div className="rounded-xl border bg-background/50 px-3 py-2 text-right">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Current session</div>
                <div className="mt-1 text-sm font-medium">{sessionHeading}</div>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <div ref={transcriptRef} className="h-full min-h-0 overflow-y-auto px-4 py-4 md:px-5">
              <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-end gap-3">
                {loadingMessages ? (
                  <div className="w-full max-w-5xl rounded-xl border bg-card/60 px-4 py-6 text-sm text-muted-foreground">Loading conversation…</div>
                ) : messages.length === 0 ? (
                  <div className="w-full max-w-5xl rounded-xl border bg-card/60 px-4 py-6 text-sm text-muted-foreground">No messages yet. Ask Seasonal Agent something operational.</div>
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
                placeholder="Ask Seasonal Agent something real. Ctrl+Enter sends."
                className="min-h-[5.5rem] max-h-56 w-full resize-none rounded-xl border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
              />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">The browser talks only to this app. The app proxies to Seasonal Agent with the server-side token.</div>

                <div className="flex items-center gap-2">
                  {sending ? (
                    <Button type="button" variant="outline" className="rounded-xl" onClick={handleStop}>
                      <Square className="mr-2 h-4 w-4" />
                      Stop
                    </Button>
                  ) : null}

                  <Button type="button" className="rounded-xl" onClick={() => void handleSubmit()} disabled={!message.trim() || sending}>
                    {sending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Send
                  </Button>
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
  )
}
