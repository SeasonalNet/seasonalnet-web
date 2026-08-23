export type SeasonalFetchInit = RequestInit & {
  next?: {
    revalidate?: number | false
    tags?: string[]
  }
}

const DEFAULT_TIMEOUT_MS = 10_000

export function fetchWithTimeout(
  input: RequestInfo | URL,
  init: SeasonalFetchInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
) {
  const timeoutSignal = AbortSignal.timeout(Math.max(1, Math.floor(timeoutMs)))
  const signal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal
  return fetch(input, { ...init, signal })
}

export function isTimeoutError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "TimeoutError"
}
