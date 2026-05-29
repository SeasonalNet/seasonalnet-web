export type ProblemDetails = {
  type: string
  title: string
  status: number
  detail?: string
  instance?: string
  [extension: string]: unknown
}

export type ProblemJsonOptions = {
  type: string
  title: string
  status: number
  detail?: string
  instance?: string
  extensions?: Record<string, unknown>
  /**
   * Keep a temporary `error` extension for existing SPA clients while the UI
   * moves from ad-hoc error payloads to RFC 9457 problem details.
   */
  legacyError?: boolean
}

const PROBLEM_JSON = "application/problem+json; charset=utf-8"

export function problemDetails(options: ProblemJsonOptions): ProblemDetails {
  const detail = options.detail || options.title
  return {
    type: options.type,
    title: options.title,
    status: options.status,
    ...(detail ? { detail } : {}),
    ...(options.instance ? { instance: options.instance } : {}),
    ...(options.extensions || {}),
    ...(options.legacyError === false ? {} : { error: detail }),
  }
}

export function problemJson(options: ProblemJsonOptions, init?: ResponseInit) {
  const headers = new Headers(init?.headers)
  headers.set("Content-Type", PROBLEM_JSON)
  if (!headers.has("Cache-Control")) headers.set("Cache-Control", "no-store")

  return new Response(JSON.stringify(problemDetails(options)), {
    ...init,
    status: options.status,
    headers,
  })
}

export function problemDetailFromError(error: unknown, fallback = "Unexpected server error") {
  return error instanceof Error ? error.message : fallback
}
