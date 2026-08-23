import { afterEach, describe, expect, it, vi } from "vitest"

const keys = ["FREEPBX_BASE_URL", "FREEPBX_CLIENT_ID", "FREEPBX_CLIENT_SECRET", "FREEPBX_SCOPE"] as const
const originals = Object.fromEntries(keys.map((key) => [key, process.env[key]]))

async function loadGql() {
  vi.resetModules()
  return import("./freepbx-gql")
}

function configure() {
  process.env.FREEPBX_BASE_URL = "https://pbx.example.test///"
  process.env.FREEPBX_CLIENT_ID = "client-id"
  process.env.FREEPBX_CLIENT_SECRET = "client-secret"
}

afterEach(() => {
  vi.unstubAllGlobals()
  for (const key of keys) {
    const value = originals[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe("FreePBX GraphQL client", () => {
  it("obtains and reuses a client token for GraphQL requests", async () => {
    configure()
    process.env.FREEPBX_SCOPE = "gql"
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ access_token: "token", expires_in: 3600 }))
      .mockImplementation(() => Promise.resolve(Response.json({ data: { count: 4 } })))
    vi.stubGlobal("fetch", fetchMock)
    const { gql } = await loadGql()

    await expect(gql<{ count: number }>("query Count", { active: true })).resolves.toEqual({ count: 4 })
    await expect(gql<{ count: number }>("query Count")).resolves.toEqual({ count: 4 })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://pbx.example.test/admin/api/api/token")
    expect(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body)).toContain("scope=gql")
    expect(new Headers((fetchMock.mock.calls[1]?.[1] as RequestInit).headers).get("authorization")).toBe("Bearer token")
  })

  it("fails clearly for missing configuration and token endpoint errors", async () => {
    for (const key of keys) delete process.env[key]
    const missing = await loadGql()
    await expect(missing.gql("query Test")).rejects.toThrow("Missing env: FREEPBX_BASE_URL")

    configure()
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("denied", { status: 401 })))
    const rejected = await loadGql()
    await expect(rejected.gql("query Test")).rejects.toThrow("Token fetch failed (401)")
  })

  it("reports GraphQL HTTP and payload errors", async () => {
    configure()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ access_token: "token" }))
      .mockResolvedValueOnce(Response.json({ errors: [{ message: "not allowed" }] }, { status: 403 }))
      .mockResolvedValueOnce(Response.json({ errors: [{ message: "resolver failed" }] }))
    vi.stubGlobal("fetch", fetchMock)
    const { gql } = await loadGql()

    await expect(gql("query Forbidden")).rejects.toThrow("GQL HTTP 403")
    await expect(gql("query Broken")).rejects.toThrow("GQL error: resolver failed")
  })
})
