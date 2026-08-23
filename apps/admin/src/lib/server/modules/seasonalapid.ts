import "server-only"

import { getCachedValue } from "@seasonalnet/shell/src/lib/server/cache"
import { fetchWithTimeout } from "@seasonalnet/shell/src/lib/fetch"

export type SeasonalApidOverview = {
  configured: boolean
  reachable: boolean
  baseUrl: string
  healthOk: boolean | null
  readyOk: boolean | null
  apiVersion: string | null
  openApiVersion: string | null
  openApiTitle: string | null
  routeCount: number | null
  publicAnnouncementCount: number | null
  publicAnnouncementsServedAt: string | null
  error?: string
}

type FetchResult = {
  ok: boolean
  status: number
  body: unknown
  error?: string
}

const RAW_BASE_URL = process.env.SEASONAL_APID_BASE_URL || "http://127.0.0.1:9088"

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim()
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`
  return withScheme.replace(/\/+$/, "")
}

const API_BASE = normalizeBaseUrl(RAW_BASE_URL)

function jsonRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function nestedRecord(value: Record<string, unknown>, key: string) {
  return jsonRecord(value[key])
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : null
}

async function fetchJson(path: string): Promise<FetchResult> {
  let response: Response

  try {
    response = await fetchWithTimeout(`${API_BASE}${path}`, {
      cache: "no-store",
      headers: { accept: "application/json" },
    })
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: null,
      error: error instanceof Error ? error.message : "fetch failed",
    }
  }

  const text = await response.text().catch(() => "")
  let body: unknown = null

  if (text) {
    try {
      body = JSON.parse(text) as unknown
    } catch {
      body = text
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    body,
  }
}

function openApiRouteCount(value: unknown) {
  const doc = jsonRecord(value)
  const paths = doc ? jsonRecord(doc.paths) : null
  if (!paths) return null
  return Object.keys(paths).length
}

function openApiInfo(value: unknown) {
  const doc = jsonRecord(value)
  const info = doc ? nestedRecord(doc, "info") : null

  return {
    openApiVersion: stringValue(doc?.openapi) ?? null,
    title: info ? stringValue(info.title) : null,
    version: info ? stringValue(info.version) : null,
    routeCount: openApiRouteCount(value),
  }
}

function announcementCount(value: unknown) {
  const doc = jsonRecord(value)
  const data = Array.isArray(doc?.data) ? doc.data : null
  const meta = doc ? nestedRecord(doc, "meta") : null

  return {
    count: numberValue(meta?.count) ?? data?.length ?? null,
    servedAt: meta ? stringValue(meta.servedAt) : null,
    apiVersion: meta ? stringValue(meta.apiVersion) : null,
  }
}

function healthOk(value: unknown) {
  const doc = jsonRecord(value)
  const data = doc ? nestedRecord(doc, "data") : null
  return booleanValue(data?.ok) ?? booleanValue(doc?.ok)
}

async function getSeasonalApidOverviewFresh(): Promise<SeasonalApidOverview> {
  try {
    // Validate URL construction early so a bad env value is reported as a module wiring issue.
    new URL(API_BASE)
  } catch (error) {
    return {
      configured: false,
      reachable: false,
      baseUrl: RAW_BASE_URL,
      healthOk: null,
      readyOk: null,
      apiVersion: null,
      openApiVersion: null,
      openApiTitle: null,
      routeCount: null,
      publicAnnouncementCount: null,
      publicAnnouncementsServedAt: null,
      error: error instanceof Error ? error.message : "Invalid SEASONAL_APID_BASE_URL.",
    }
  }

  const [health, readiness, openApi, announcements] = await Promise.all([
    fetchJson("/healthz"),
    fetchJson("/readyz"),
    fetchJson("/openapi.json"),
    fetchJson("/v1/public/announcements?site=admin"),
  ])

  const openApiDetails = openApi.ok ? openApiInfo(openApi.body) : null
  const announcementsDetails = announcements.ok ? announcementCount(announcements.body) : null
  const healthStatus = health.ok ? healthOk(health.body) : null
  const readyStatus = readiness.ok ? healthOk(readiness.body) : false
  const reachable = health.ok || readiness.ok || openApi.ok || announcements.ok

  return {
    configured: true,
    reachable,
    baseUrl: API_BASE,
    healthOk: healthStatus,
    readyOk: readyStatus,
    apiVersion: announcementsDetails?.apiVersion ?? openApiDetails?.version ?? null,
    openApiVersion: openApiDetails?.openApiVersion ?? null,
    openApiTitle: openApiDetails?.title ?? null,
    routeCount: openApiDetails?.routeCount ?? null,
    publicAnnouncementCount: announcementsDetails?.count ?? null,
    publicAnnouncementsServedAt: announcementsDetails?.servedAt ?? null,
    ...(!reachable
      ? {
          error:
            health.error ||
            readiness.error ||
            openApi.error ||
            announcements.error ||
            "Unable to reach SeasonalAPID.",
        }
      : {}),
  }
}

export async function getSeasonalApidOverview(): Promise<SeasonalApidOverview> {
  const cached = await getCachedValue(
    {
      key: "admin:seasonalapid:overview",
      ttlMs: 10_000,
      staleTtlMs: 60_000,
    },
    getSeasonalApidOverviewFresh,
  )

  return cached.value
}
