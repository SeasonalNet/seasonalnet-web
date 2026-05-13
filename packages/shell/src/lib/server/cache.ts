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
const inflight = new Map<string, Promise<unknown>>()

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

  const existing = inflight.get(options.key) as Promise<T> | undefined
  if (existing) {
    return { value: await existing, status: "coalesced" }
  }

  const pending = loader()
    .then((value) => {
      const expiresAt = nowMs() + ttlMs
      values.set(options.key, {
        value,
        expiresAt,
        staleUntil: expiresAt + staleTtlMs,
      })
      return value
    })
    .catch((error) => {
      const staleEntry = values.get(options.key) as CacheEntry<T> | undefined
      if (staleEntry && staleEntry.staleUntil > nowMs()) {
        return staleEntry.value
      }
      throw error
    })
    .finally(() => {
      inflight.delete(options.key)
    })

  inflight.set(options.key, pending)

  try {
    return { value: await pending, status: "miss" }
  } catch (error) {
    if (entry && entry.staleUntil > nowMs()) {
      return { value: entry.value, status: "stale" }
    }
    throw error
  }
}

export function cacheControlHeader(ttlSeconds: number, staleWhileRevalidateSeconds = ttlSeconds * 5) {
  const ttl = Math.max(0, Math.floor(ttlSeconds))
  const stale = Math.max(0, Math.floor(staleWhileRevalidateSeconds))
  return `public, max-age=${ttl}, s-maxage=${ttl}, stale-while-revalidate=${stale}`
}

export function privateCacheControlHeader(ttlSeconds: number) {
  const ttl = Math.max(0, Math.floor(ttlSeconds))
  return `private, max-age=${ttl}`
}
