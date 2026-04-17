# @seasonalnet/agent

Seasonal Agent operator web frontend.

This app is intentionally thin. It does not talk to Ollama directly. It proxies to the Seasonal Agent HTTP API so the runtime remains the system of record for sessions, tool orchestration, and streamed turn events.

## Required environment

Set these for the Next.js runtime that serves this app:

- `SEASONAL_AGENT_BASE_URL` — base URL for the Seasonal Agent daemon. Default: `http://127.0.0.1:8765`
- `SEASONAL_AGENT_API_TOKEN` — bearer token with `chat:*` and `chat:history:read` access

## Current surface

- session list in a light left rail
- streamed chat over `POST /api/v1/chat/stream`
- server-side proxy routes so the browser never receives the agent token
- compact tool cards and optional thinking disclosure in the conversation

## Notes

- This app is a front end, not a second agent runtime.
- Keep it boring. The conversation is the primary surface.
- Do not turn it into a platform shell with side panels everywhere.
