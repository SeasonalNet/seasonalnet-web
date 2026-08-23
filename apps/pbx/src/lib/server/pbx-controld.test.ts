import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  assertSelfServiceCredentialAllowed,
  claimExtension,
  getExtensionByDiscordId,
  getPoolSummary,
  listOperationsForDiscordId,
  problemResponse,
  revealExtensionCredentials,
  rotateExtensionCredentials,
  updateExtensionProfile,
} from "./pbx-controld"

const owner = {
  id: 7,
  discordId: "operator-1",
  extension: "4100",
  state: "active" as const,
  displayName: "Operator",
  voicemailEmailMarker: null,
  createdAt: "2026-08-23T00:00:00Z",
  updatedAt: "2026-08-23T00:00:00Z",
}

beforeEach(() => {
  process.env.PBX_CONTROL_BEARER_TOKEN = "test-token"
  delete process.env.PBX_CONTROLD_CLIENT_SECRET
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  delete process.env.PBX_CONTROL_BEARER_TOKEN
})

describe("pbx-controld response validation", () => {
  it("classifies a valid owner and authenticates the upstream request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(owner))
    vi.stubGlobal("fetch", fetchMock)

    const result = await getExtensionByDiscordId("operator/1")

    expect(result?.classification?.classification).toBe("managed-pool")
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("operator%2F1")
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer test-token")
  })

  it("maps missing resources to null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(Response.json({ title: "Not found" }, { status: 404 }))))

    await expect(getExtensionByDiscordId("missing")).resolves.toBeNull()
    await expect(getPoolSummary()).resolves.toBeNull()
  })

  it("rejects malformed successful payloads as a sanitized bad gateway problem", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ extension: 4100 })))

    let caught: unknown
    try {
      await getExtensionByDiscordId("operator-1")
    } catch (error) {
      caught = error
    }

    const response = problemResponse(caught)
    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toMatchObject({
      type: "https://seasonalnet.org/problems/pbx-controld-invalid-response",
      status: 502,
    })
  })

  it("validates pool summaries and operation lists", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ total: 900, enabled: 899, available: 700, byState: { available: 700 } }))
      .mockResolvedValueOnce(Response.json([{ id: "op-1", status: "succeeded" }]))
    vi.stubGlobal("fetch", fetchMock)

    await expect(getPoolSummary()).resolves.toMatchObject({ available: 700 })
    await expect(listOperationsForDiscordId("operator 1", 3)).resolves.toEqual([{ id: "op-1", status: "succeeded" }])
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("discordId=operator%201&limit=3")
  })

  it("validates mutation responses and classifies returned owners", async () => {
    const mutation = { replayed: false, owner }
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(Response.json(mutation)))
    vi.stubGlobal("fetch", fetchMock)

    await expect(claimExtension({ discordId: "operator-1", displayName: "Operator" })).resolves.toMatchObject({
      owner: { classification: { classification: "managed-pool" } },
    })
    await expect(updateExtensionProfile({ extension: "4100" })).resolves.toMatchObject({ owner: { extension: "4100" } })
    await expect(revealExtensionCredentials("4100")).resolves.toMatchObject({ replayed: false })
    await expect(rotateExtensionCredentials("4100", true)).resolves.toMatchObject({ replayed: false })

    for (const call of fetchMock.mock.calls) {
      const init = call[1] as RequestInit
      expect(new Headers(init.headers).get("idempotency-key")).toBeTruthy()
      expect(new Headers(init.headers).get("content-type")).toBe("application/json")
    }
  })

  it("rejects malformed pool, operation, and mutation responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ total: "many" }))
      .mockResolvedValueOnce(Response.json([{ status: "running" }]))
      .mockResolvedValueOnce(Response.json({ replayed: "no", owner: null }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(getPoolSummary()).rejects.toThrow("invalid extension pool summary")
    await expect(listOperationsForDiscordId("operator-1")).rejects.toThrow("invalid operation list")
    await expect(claimExtension({ discordId: "operator-1" })).rejects.toThrow("invalid extension mutation")
  })

  it("obtains scoped client tokens and retries one unauthorized request", async () => {
    delete process.env.PBX_CONTROL_BEARER_TOKEN
    process.env.PBX_CONTROLD_CLIENT_SECRET = "client-secret"
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ accessToken: "first", expiresIn: 900 }))
      .mockResolvedValueOnce(Response.json({ title: "Expired" }, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ accessToken: "second", expiresIn: 900 }))
      .mockResolvedValueOnce(Response.json(owner))
    vi.stubGlobal("fetch", fetchMock)

    await expect(getExtensionByDiscordId("operator-1")).resolves.toMatchObject({ extension: "4100" })
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/v1/auth/token")
    expect(new Headers((fetchMock.mock.calls[3]?.[1] as RequestInit).headers).get("authorization")).toBe("Bearer second")
  })

  it("fails closed when neither PBX credential is configured", async () => {
    delete process.env.PBX_CONTROL_BEARER_TOKEN
    delete process.env.PBX_CONTROLD_CLIENT_SECRET
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 1_000_000)

    let caught: unknown
    try {
      await getPoolSummary()
    } catch (error) {
      caught = error
    }
    const response = problemResponse(caught)
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      type: "https://seasonalnet.org/problems/pbx-controld-client-not-configured",
    })
  })
})

describe("PBX self-service and unhappy paths", () => {
  it("allows credentials only for managed-pool extensions", () => {
    expect(() => assertSelfServiceCredentialAllowed(owner)).not.toThrow()
    expect(() => assertSelfServiceCredentialAllowed({ ...owner, extension: "1000" })).toThrow(
      "Self-service credential reveal and rotation are only exposed for managed-pool extensions.",
    )
  })

  it("maps timeout and transport failures without exposing their messages", async () => {
    const timeout = problemResponse(new DOMException("secret timeout detail", "TimeoutError"))
    const unavailable = problemResponse(new Error("private upstream hostname"))

    expect(timeout.status).toBe(504)
    expect(unavailable.status).toBe(502)
    expect(JSON.stringify(await timeout.json())).not.toContain("secret timeout detail")
    expect(JSON.stringify(await unavailable.json())).not.toContain("private upstream hostname")
  })
})
