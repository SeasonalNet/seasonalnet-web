# TODO — Agent reconnect and recovery follow-ups

## Summary

The current Seasonal Agent console already has the remade front-end shell and modernized conversation surface.

The remaining work is no longer a visual-overhaul problem. It is a turn-lifecycle and recovery-correctness problem that spans both:

- `seasonalnet-web/apps/agent`
- `seasonal-agent`

This document tracks the remaining follow-up work after the reconnect-safe baseline and the first recoverable-turn pass.

## Current status

### Shipped already

- [x] Durable backend turn journaling exists
- [x] Replayable turn events exist
- [x] Durable turn snapshots exist
- [x] SPA recovery can rebuild an in-flight turn from snapshot plus replay events
- [x] The remade console surfaces turn state and reconnect notices
- [x] Session reopen no longer depends only on the live stream path
- [x] Recoverable-turn lookup exists for interrupted `aborted` and `failed` turns with durable state

### Still not fully solved

- [ ] Reload churn can still abort a live turn because execution is still tied to the stream lifecycle
- [ ] Journal state and canonical session history are still separate systems with incomplete reconciliation
- [ ] Recovery correctness still needs hardening around replay deduplication and terminal cleanup
- [ ] Detached execution still does not exist
- [ ] The UI notices are serviceable, but the policy around interrupted turns still needs to be made more explicit

## Phase A — Recoverable turn model

### Goal

Treat the latest interrupted-but-still-useful turn as recoverable, not only the latest strictly active turn.

### Status

Partially shipped.

### Completed in this slice

- [x] Backend lookup for the latest recoverable turn in a session
- [x] Recoverable statuses currently include:
  - `queued`
  - `running`
  - `aborted`
  - `failed`
- [x] Recoverable lookup requires durable recovery material, not just turn metadata
- [x] SPA recovery flow now checks:
  1. active turn
  2. recoverable turn
  3. persisted session history fallback
- [x] A recently aborted or failed turn with durable state can remain visible after reload

### Remaining work

- [ ] Decide whether unreconciled `completed` turns should also be considered recoverable
- [ ] Add an explicit backend flag for whether a turn has already been reconciled into canonical message history
- [ ] Make the recoverable-turn contract more explicit in tests and API docs

## Phase B — Disconnect grace and abort behavior

### Goal

Reduce accidental turn loss during quick reloads before detached execution exists.

### Work

- [ ] Add a short disconnect grace period before finalizing a stream disconnect as `aborted`
- [ ] Distinguish clean completion, client disconnect, backend failure, and explicit cancellation in turn metadata
- [ ] Prevent immediate abort on brief reload churn where recovery is likely
- [ ] Ensure disconnect-grace logic remains idempotent under repeated disconnects

## Phase C — Journal-to-history reconciliation

### Goal

Make durable turn state and canonical session history cooperate cleanly.

### Work

- [ ] Define when a completed turn becomes canonical message history
- [ ] Record whether final assistant output has already been promoted into `agent_messages`
- [ ] Ensure recovery never re-renders content that is already canonical history
- [ ] Decide what policy applies to partial `aborted` or `failed` assistant output
- [ ] Add a reconciliation path for completed, failed, and aborted turns with partial content

## Phase D — Replay hardening in the remade console

### Goal

Keep the rebuilt UI accurate under repeated reloads and interrupted streams.

### Work

- [ ] Harden assistant delta deduplication during replay
- [ ] Harden tool-event deduplication during replay
- [ ] Clear stale recovery notices once reconciliation finishes
- [ ] Ensure session switching cannot leak recovery state across conversations
- [ ] Keep status badges aligned with the real terminal turn state

## Phase E — True detached execution

### Goal

Let a turn keep running when the browser disconnects, where policy permits.

### Work

- [ ] Decouple execution lifecycle from the SSE connection lifecycle
- [ ] Continue journaling while no client is attached
- [ ] Allow reattach to a still-running turn
- [ ] Add cleanup for orphaned detached turns
- [ ] Add explicit cancellation for detached turns

## Phase F — Tests and validation

### Backend

- [x] Recoverable-turn lookup is covered for a terminal interrupted turn with durable state
- [ ] Disconnect grace is covered
- [ ] Reconciliation is covered
- [ ] Terminal finalization remains idempotent under disconnect and replay races

### Frontend

- [ ] Reload during streaming restores a turn without duplicated assistant text
- [ ] Reload during tool execution restores tool progress without duplicate cards
- [ ] Recently aborted turn still displays recoverable content
- [ ] Recovery notices clear once the turn becomes canonical history
- [ ] Session switching does not leak recovery state

### Manual validation

- [ ] Start a long turn, reload once, and confirm active recovery
- [ ] Start a long turn, force an abort, and confirm partial recovery still renders
- [ ] Start a tool-heavy turn, reload mid-tool, and confirm tool state remains coherent
- [ ] Confirm terminal turns do not duplicate content after replay
- [ ] Confirm completed turns reconcile into canonical history exactly once once Phase C lands
