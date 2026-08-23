import "server-only"

type CacheStatus = "hit" | "miss" | "coalesced" | "stale"

type CacheEntry<T> = {
  value: T
  expiresAt: number
  staleUntil: number
}

type CacheOptions = {
  key: string
  ttlMs: number
  staleTtlMs?: number
}

type CachedValue<T> = {
  value: T
  status: CacheStatus
}

const values = new Map<string, CacheEntry<unknown>>()
const inflight = new Map<string, Promise<CachedValue<unknown>>>()

function nowMs() {
  return Date.now()
}

export async function getCachedValue<T>(
  options: CacheOptions,
  loader: () => Promise<T>,
): Promise<CachedValue<T>> {
  const ttlMs = Math.max(0, Math.floor(options.ttlMs))
  const staleTtlMs = Math.max(0, Math.floor(options.staleTtlMs ?? 0))
  const now = nowMs()
  const entry = values.get(options.key) as CacheEntry<T> | undefined

  if (entry && entry.expiresAt > now) {
    return { value: entry.value, status: "hit" }
  }

  const existing = inflight.get(options.key) as Promise<CachedValue<T>> | undefined
  if (existing) {
    const result = await existing
    return { value: result.value, status: result.status === "stale" ? "stale" : "coalesced" }
  }

  const pending = loader()
    .then((value) => {
      const expiresAt = nowMs() + ttlMs
      values.set(options.key, {
        value,
        expiresAt,
        staleUntil: expiresAt + staleTtlMs,
      })
      return { value, status: "miss" as const }
    })
    .catch((error) => {
      const staleEntry = values.get(options.key) as CacheEntry<T> | undefined
      if (staleEntry && staleEntry.staleUntil > nowMs()) {
        return { value: staleEntry.value, status: "stale" as const }
      }
      throw error
    })
    .finally(() => {
      inflight.delete(options.key)
    })

  inflight.set(options.key, pending)

  return pending
}

export function cacheControlHeader(ttlSeconds: number, staleWhileRevalidateSeconds = ttlSeconds * 5) {
  const ttl = Math.max(0, Math.floor(ttlSeconds))
  const stale = Math.max(0, Math.floor(staleWhileRevalidateSeconds))
  return `public, max-age=${ttl}, s-maxage=${ttl}, stale-while-revalidate=${stale}`
}
