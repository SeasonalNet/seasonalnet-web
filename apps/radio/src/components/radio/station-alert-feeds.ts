"use client"

import * as React from "react"
import { fetchWithTimeout } from "@seasonalnet/shell/src/lib/fetch"

export type ActiveAlert = {
  id: string
  event: string
  headline: string
  nwsHeadline?: string | null
  description?: string | null
  instruction?: string | null
  severity: string
  urgency: string
  certainty: string
  area: string
  effective: string | null
  ends: string | null
  expires: string | null
  sent: string | null
  sameCodes?: string[]
  geometry?: GeoJSON.Geometry | null
  links: { nws: string }
}

export type ActiveAlertsPayload = {
  stationId: string
  serviceAreaName: string
  generatedAt: string
  source: "nws"
  degraded?: boolean
  upstreamFailures?: number
  alerts: ActiveAlert[]
}

type FeedSender = { name: string; kind?: "relay" | "origin" | "unknown" }

export type StationHandledAlert = {
  id: string
  event: string
  headline: string
  severity: string
  urgency: string
  certainty: string
  area: string
  effective?: string | null
  ends: string | null
  expires: string | null
  sent?: string | null
  sameCodes?: string[]
  source?: string | null
  from: FeedSender | null
  links?: { primary?: string; nws?: string }
}

export type StationHandledAlertsPayload = {
  ok?: boolean
  enabled: boolean
  stationId: string
  generatedAt: string
  source: string
  error?: string
  alerts: StationHandledAlert[]
}

export type StationAlertFeedKind = "active" | "handled"

type FeedSnapshot<T> = {
  data: T | null
  error: string | null
  isFetching: boolean
  updatedAt: number | null
}

type FeedStore<T> = {
  state: FeedSnapshot<T>
  listeners: Set<() => void>
  inFlight: Promise<void> | null
  consumers: number
  timer: number | null
}

const stores = new Map<string, FeedStore<unknown>>()

function feedKey(stationId: string, kind: StationAlertFeedKind) {
  return `${stationId}:${kind}`
}

function endpointFor(stationId: string, kind: StationAlertFeedKind) {
  const path = kind === "active" ? "alerts" : "handled-alerts"
  return `/api/stations/${encodeURIComponent(stationId)}/${path}`
}

function getStore<T>(key: string): FeedStore<T> {
  const existing = stores.get(key) as FeedStore<T> | undefined
  if (existing) return existing

  const store: FeedStore<T> = {
    state: {
      data: null,
      error: null,
      isFetching: true,
      updatedAt: null,
    },
    listeners: new Set(),
    inFlight: null,
    consumers: 0,
    timer: null,
  }
  stores.set(key, store as FeedStore<unknown>)
  return store
}

function publish<T>(store: FeedStore<T>, state: FeedSnapshot<T>) {
  store.state = state
  store.listeners.forEach((listener) => listener())
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to load alert feed"
}

async function loadFeed<T>(store: FeedStore<T>, endpoint: string) {
  if (store.inFlight) return store.inFlight

  publish(store, { ...store.state, error: null, isFetching: true })
  const request = (async () => {
    try {
      const response = await fetchWithTimeout(endpoint, { cache: "no-store" })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = (await response.json()) as T
      publish(store, {
        data,
        error: null,
        isFetching: false,
        updatedAt: Date.now(),
      })
    } catch (error: unknown) {
      publish(store, {
        ...store.state,
        error: store.state.data ? null : errorMessage(error),
        isFetching: false,
      })
    } finally {
      store.inFlight = null
    }
  })()

  store.inFlight = request
  return request
}

function isFresh<T>(store: FeedStore<T>, pollMs: number) {
  return store.state.updatedAt !== null && Date.now() - store.state.updatedAt < pollMs
}

function acquirePolling<T>(store: FeedStore<T>, endpoint: string, pollMs: number) {
  store.consumers += 1
  if (store.timer === null) {
    store.timer = window.setInterval(() => {
      if (document.visibilityState !== "hidden") void loadFeed(store, endpoint)
    }, pollMs)
  }

  return () => {
    store.consumers = Math.max(0, store.consumers - 1)
    if (store.consumers === 0 && store.timer !== null) {
      window.clearInterval(store.timer)
      store.timer = null
    }
  }
}

type FeedOptions = {
  enabled?: boolean
  pollMs?: number
}

export function useStationAlertFeed<T>(
  stationId: string,
  kind: StationAlertFeedKind,
  { enabled = true, pollMs = 60_000 }: FeedOptions = {},
) {
  const key = feedKey(stationId, kind)
  const store = React.useMemo(() => getStore<T>(key), [key])
  const endpoint = React.useMemo(() => endpointFor(stationId, kind), [stationId, kind])
  const intervalMs = Math.max(10_000, Math.floor(pollMs))

  const subscribe = React.useCallback(
    (listener: () => void) => {
      store.listeners.add(listener)
      return () => store.listeners.delete(listener)
    },
    [store],
  )
  const getSnapshot = React.useCallback(() => store.state, [store])
  const snapshot = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  React.useEffect(() => {
    if (!enabled) return

    const release = acquirePolling(store, endpoint, intervalMs)
    if (!isFresh(store, intervalMs)) void loadFeed(store, endpoint)

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !isFresh(store, intervalMs)) {
        void loadFeed(store, endpoint)
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      release()
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [enabled, endpoint, intervalMs, store])

  const refresh = React.useCallback(() => {
    void loadFeed(store, endpoint)
  }, [endpoint, store])

  return {
    data: snapshot.data,
    error: snapshot.error,
    isFetching: snapshot.isFetching,
    loading: snapshot.isFetching && snapshot.data === null,
    refreshing: snapshot.isFetching && snapshot.data !== null,
    refresh,
  }
}
