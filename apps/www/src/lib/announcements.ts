import "server-only"
import { fetchWithTimeout } from "@seasonalnet/shell/src/lib/fetch"

export type SiteAnnouncement = {
  id: string
  title: string
  body: string
  level?: "info" | "success" | "warning" | "critical"
  href?: string | null
  hrefLabel?: string | null
  enabled?: boolean
  startsAt?: string | null
  endsAt?: string | null
  sites?: string[]
}

type ApiMeta = {
  apiVersion?: string
  servedAt?: string
  requestId?: string
  count?: number
}

type ApiCollection<T> = {
  data?: T[]
  meta?: ApiMeta
  links?: { self?: string; next?: string }
}

const RAW_SEASONAL_APID_BASE_URL = process.env.SEASONAL_APID_BASE_URL || "http://127.0.0.1:9088"
const SEASONAL_APID_BASE_URL = (/^https?:\/\//i.test(RAW_SEASONAL_APID_BASE_URL)
  ? RAW_SEASONAL_APID_BASE_URL
  : `http://${RAW_SEASONAL_APID_BASE_URL}`
).replace(/\/$/, "")

function normalizeHost(host: string) {
  return (host || "").toLowerCase().split(":")[0]
}

function deriveSiteIdFromHost(host: string) {
  const h = normalizeHost(host)
  const first = h.split(".")[0]
  return first || ""
}

function emptyDocument(self = "/v1/public/announcements"): ApiCollection<SiteAnnouncement> {
  return {
    data: [],
    meta: {
      apiVersion: "1",
      servedAt: new Date().toISOString(),
      requestId: "local-fallback",
      count: 0,
    },
    links: { self },
  }
}

function isAnnouncement(value: unknown): value is SiteAnnouncement {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const item = value as SiteAnnouncement
  return typeof item.id === "string" && typeof item.title === "string" && typeof item.body === "string"
}

function normalizeDocument(value: unknown, self: string): ApiCollection<SiteAnnouncement> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return emptyDocument(self)
  const doc = value as ApiCollection<SiteAnnouncement>
  const data = Array.isArray(doc.data) ? doc.data.filter(isAnnouncement) : []

  return {
    data,
    meta: {
      apiVersion: doc.meta?.apiVersion ?? "1",
      servedAt: doc.meta?.servedAt ?? new Date().toISOString(),
      requestId: doc.meta?.requestId ?? "upstream-unknown",
      count: doc.meta?.count ?? data.length,
    },
    links: {
      self: doc.links?.self ?? self,
      ...(doc.links?.next ? { next: doc.links.next } : {}),
    },
  }
}

export async function loadAnnouncements(opts?: { host?: string; site?: string }): Promise<ApiCollection<SiteAnnouncement>> {
  const site = opts?.site ?? process.env.SEASONALNET_SITE_ID ?? deriveSiteIdFromHost(opts?.host ?? "")
  const upstream = new URL("/v1/public/announcements", SEASONAL_APID_BASE_URL)
  if (site) upstream.searchParams.set("site", site)

  const self = `${upstream.pathname}${upstream.search}`

  try {
    const response = await fetchWithTimeout(upstream, {
      cache: "no-store",
      headers: { accept: "application/json" },
    })

    if (!response.ok) return emptyDocument(self)

    const parsed = (await response.json()) as unknown
    return normalizeDocument(parsed, self)
  } catch {
    return emptyDocument(self)
  }
}
