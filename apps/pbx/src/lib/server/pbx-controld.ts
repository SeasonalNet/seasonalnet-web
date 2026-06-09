import { randomUUID } from "node:crypto"

export type PbxProblem = {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  [key: string]: unknown
}

export type ExtensionOwner = {
  id: number
  discordId: string
  extension: string
  state: "active" | "suspended" | "releasing" | "released" | "orphaned"
  displayName: string | null
  voicemailEmailMarker: string | null
  createdAt: string
  updatedAt: string
}

export type ExtensionCredentials = {
  sipSecret: string
  voicemailPin: string
}

export type CredentialMetadata = {
  extension: string
  sipSecretStored: boolean
  voicemailPinStored: boolean
  keyId: string | null
  createdAt: string
  updatedAt: string
  rotatedAt: string
  lastRevealedAt: string | null
}

export type ExtensionMutationResponse = {
  operation?: Operation
  owner: ExtensionOwner | null
  replayed: boolean
  credentials?: ExtensionCredentials | null
  credentialMetadata?: CredentialMetadata | null
}

export type Operation = {
  id: string
  operation: string
  status: "pending" | "running" | "succeeded" | "failed" | "cancelled"
  extension: string | null
  discordId: string | null
  reason: string | null
  error: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export type PoolSummary = {
  total: number
  enabled: number
  available: number
  byState: Record<string, number>
}

export class PbxControlError extends Error {
  readonly status: number
  readonly problem: PbxProblem

  constructor(status: number, problem: PbxProblem) {
    super(problem.detail || problem.title || `pbx-controld request failed with ${status}`)
    this.name = "PbxControlError"
    this.status = status
    this.problem = problem
  }
}

type CachedToken = {
  accessToken: string
  expiresAtMs: number
}

let cachedToken: CachedToken | null = null

function baseUrl() {
  return (process.env.PBX_CONTROLD_BASE_URL || "http://127.0.0.1:9091").replace(/\/+$/, "")
}

function clientSecret() {
  return process.env.PBX_CONTROLD_CLIENT_SECRET || process.env.PBX_CONTROL_BEARER_TOKEN || ""
}

function mustClientSecret() {
  const value = clientSecret()
  if (!value) {
    throw new PbxControlError(503, {
      type: "https://seasonalnet.org/problems/pbx-controld-client-not-configured",
      title: "PBX control client not configured",
      status: 503,
      detail: "PBX_CONTROLD_CLIENT_SECRET is not configured for the PBX SPA.",
    })
  }
  return value
}

async function parseResponseJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function problemFromUnknown(status: number, value: unknown): PbxProblem {
  if (value && typeof value === "object") return value as PbxProblem
  return {
    title: "PBX control request failed",
    status,
    detail: typeof value === "string" ? value : undefined,
  }
}

async function getAccessToken() {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAtMs - 30_000 > now) return cachedToken.accessToken

  const response = await fetch(`${baseUrl()}/v1/auth/token`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${mustClientSecret()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      requestedScopes: ["read:extensions", "control:extensions"],
      requestedPrefixes: [
        "/v1/extensions",
        "/v1/discord-users",
        "/v1/extension-claims",
        "/v1/operations",
        "/v1/extension-pool",
      ],
      ttlSeconds: 900,
    }),
    cache: "no-store",
  })

  const json = await parseResponseJson(response)
  if (!response.ok) throw new PbxControlError(response.status, problemFromUnknown(response.status, json))

  const payload = json as { accessToken?: unknown; expiresIn?: unknown }
  if (typeof payload.accessToken !== "string") {
    throw new PbxControlError(502, {
      title: "Invalid PBX control token response",
      status: 502,
      detail: "pbx-controld did not return an access token.",
    })
  }

  const expiresIn = typeof payload.expiresIn === "number" ? payload.expiresIn : 900
  cachedToken = {
    accessToken: payload.accessToken,
    expiresAtMs: now + expiresIn * 1000,
  }
  return payload.accessToken
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken()
  const headers = new Headers(init.headers)
  headers.set("authorization", `Bearer ${token}`)
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json")

  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  })

  const json = await parseResponseJson(response)
  if (!response.ok) throw new PbxControlError(response.status, problemFromUnknown(response.status, json))
  return json as T
}

function idempotencyHeaders() {
  return { "idempotency-key": randomUUID() }
}

export async function getExtensionByDiscordId(discordId: string): Promise<ExtensionOwner | null> {
  try {
    return await request<ExtensionOwner>(`/v1/discord-users/${encodeURIComponent(discordId)}/extension`)
  } catch (error) {
    if (error instanceof PbxControlError && error.status === 404) return null
    throw error
  }
}

export async function getPoolSummary(): Promise<PoolSummary | null> {
  try {
    return await request<PoolSummary>("/v1/extension-pool/summary")
  } catch (error) {
    if (error instanceof PbxControlError && error.status === 404) return null
    throw error
  }
}

export async function listOperationsForDiscordId(discordId: string, limit = 8): Promise<Operation[]> {
  return request<Operation[]>(`/v1/operations?discordId=${encodeURIComponent(discordId)}&limit=${limit}`)
}

export async function claimExtension(input: { discordId: string; displayName?: string | null }) {
  return request<ExtensionMutationResponse>("/v1/extension-claims", {
    method: "POST",
    headers: idempotencyHeaders(),
    body: JSON.stringify({
      discordId: input.discordId,
      displayName: input.displayName || null,
      reason: "PBX self-service dashboard claim",
    }),
  })
}

export async function updateExtensionProfile(input: { extension: string; displayName?: string | null }) {
  return request<ExtensionMutationResponse>(`/v1/extensions/${encodeURIComponent(input.extension)}/profile`, {
    method: "PATCH",
    headers: idempotencyHeaders(),
    body: JSON.stringify({
      displayName: input.displayName || null,
      reason: "PBX self-service dashboard profile update",
    }),
  })
}

export async function revealExtensionCredentials(extension: string) {
  return request<ExtensionMutationResponse>(`/v1/extensions/${encodeURIComponent(extension)}/credentials/reveal`, {
    method: "POST",
    headers: idempotencyHeaders(),
    body: JSON.stringify({ reason: "PBX self-service dashboard credential reveal" }),
  })
}

export async function rotateExtensionCredentials(extension: string, resetVoicemailPin: boolean) {
  return request<ExtensionMutationResponse>(`/v1/extensions/${encodeURIComponent(extension)}/credentials/rotate`, {
    method: "POST",
    headers: idempotencyHeaders(),
    body: JSON.stringify({
      reason: "PBX self-service dashboard credential rotation",
      resetVoicemailPin,
    }),
  })
}

export function problemResponse(error: unknown) {
  if (error instanceof PbxControlError) {
    return Response.json(error.problem, { status: error.status })
  }

  const message = error instanceof Error ? error.message : String(error)
  return Response.json(
    {
      type: "https://seasonalnet.org/problems/pbx-spa-upstream-error",
      title: "PBX dashboard request failed",
      status: 500,
      detail: message,
    },
    { status: 500 },
  )
}
