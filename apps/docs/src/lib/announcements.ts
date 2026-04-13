import "server-only"
import { readFile, stat } from "node:fs/promises"

export type SiteAnnouncement = {
  id: string
  title: string
  body: string
  level?: "info" | "success" | "warning" | "danger"
  href?: string
  hrefLabel?: string
  enabled?: boolean
  startsAt?: string
  endsAt?: string
  sites?: string[]
  hosts?: string[]
}

const ANNOUNCEMENTS_PATH =
  process.env.SEASONALNET_ANNOUNCEMENTS_PATH || "/etc/seasonalnet/announcements.json"

type DocShape = { items?: SiteAnnouncement[] } | SiteAnnouncement[]

let cache: { mtimeMs: number; size: number; items: SiteAnnouncement[] } | null = null

function normalizeHost(host: string) {
  return (host || "").toLowerCase().split(":")[0]
}

function deriveSiteIdFromHost(host: string) {
  const h = normalizeHost(host)
  const first = h.split(".")[0]
  return first || ""
}

function hostMatches(pattern: string, host: string) {
  const p = (pattern || "").toLowerCase()
  const h = normalizeHost(host)
  if (!p || !h) return false
  if (p === "*") return true
  if (p.startsWith("*.")) {
    const root = p.slice(2)
    return h === root || h.endsWith("." + root)
  }
  return h === p
}

export async function loadAnnouncements(): Promise<{
  items: SiteAnnouncement[]
  etag: string | null
}> {
  try {
    const st = await stat(ANNOUNCEMENTS_PATH)
    const mtimeMs = Math.floor(st.mtimeMs)
    const size = st.size
    const etag = `"${size}-${mtimeMs}"`

    if (cache && cache.mtimeMs === mtimeMs && cache.size === size) {
      return { items: cache.items, etag }
    }

    const raw = await readFile(ANNOUNCEMENTS_PATH, "utf8")
    const parsed = JSON.parse(raw) as DocShape
    const items = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.items)
        ? parsed.items
        : []

    cache = { mtimeMs, size, items }
    return { items, etag }
  } catch {
    return { items: cache?.items ?? [], etag: null }
  }
}

export function getActiveAnnouncementsFrom(
  all: SiteAnnouncement[],
  now = new Date(),
  opts?: { host?: string }
): SiteAnnouncement[] {
  const t = now.getTime()
  const host = opts?.host || ""
  const siteId = deriveSiteIdFromHost(host)

  return all
    .filter((a) => a.enabled !== false)
    .filter((a) => {
      if (a.sites?.length) {
        if (!siteId) return false
        if (!a.sites.includes(siteId)) return false
      }
      if (a.hosts?.length) {
        if (!a.hosts.some((p) => hostMatches(p, host))) return false
      }
      return true
    })
    .filter((a) => {
      if (a.startsAt && Number.isFinite(Date.parse(a.startsAt))) {
        if (t < Date.parse(a.startsAt)) return false
      }
      if (a.endsAt && Number.isFinite(Date.parse(a.endsAt))) {
        if (t > Date.parse(a.endsAt)) return false
      }
      return true
    })
}
