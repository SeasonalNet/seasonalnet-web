import { afterEach, describe, expect, it, vi } from "vitest"

import { loadAnnouncements as loadAdminAnnouncements } from "./admin/src/lib/announcements"
import { loadAnnouncements as loadDocsAnnouncements } from "./docs/src/lib/announcements"
import { loadAnnouncements as loadPbxAnnouncements } from "./pbx/src/lib/announcements"
import { loadAnnouncements as loadProvAnnouncements } from "./prov/src/lib/announcements"
import { loadAnnouncements as loadRadioAnnouncements } from "./radio/src/lib/announcements"
import { loadAnnouncements as loadWwwAnnouncements } from "./www/src/lib/announcements"

vi.mock("server-only", () => ({}))

const implementations = [
  ["admin", loadAdminAnnouncements],
  ["docs", loadDocsAnnouncements],
  ["pbx", loadPbxAnnouncements],
  ["prov", loadProvAnnouncements],
  ["radio", loadRadioAnnouncements],
  ["www", loadWwwAnnouncements],
] as const

afterEach(() => {
  vi.unstubAllGlobals()
})

describe.each(implementations)("%s announcements contract", (_name, loadAnnouncements) => {
  it("derives the site, filters malformed entries, and fills collection metadata", async () => {
    const upstream = {
      data: [
        { id: "maintenance", title: "Maintenance", body: "Planned window" },
        { id: "missing-body", title: "Invalid" },
        null,
      ],
      meta: { apiVersion: "2" },
      links: { next: "/v1/public/announcements?page=2" },
    }
    const fetchMock = vi.fn().mockResolvedValue(Response.json(upstream))
    vi.stubGlobal("fetch", fetchMock)

    const document = await loadAnnouncements({ host: "RADIO.SeasonalNet.org:443" })

    expect(fetchMock).toHaveBeenCalledOnce()
    const requestedUrl = new URL(String(fetchMock.mock.calls[0]?.[0]))
    expect(requestedUrl.pathname).toBe("/v1/public/announcements")
    expect(requestedUrl.searchParams.get("site")).toBe("radio")
    expect(document.data).toEqual([upstream.data[0]])
    expect(document.meta).toMatchObject({ apiVersion: "2", count: 1, requestId: "upstream-unknown" })
    expect(document.links).toEqual({
      self: "/v1/public/announcements?site=radio",
      next: "/v1/public/announcements?page=2",
    })
  })

  it("honors an explicit site and keeps valid upstream metadata", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      data: [],
      meta: { servedAt: "2026-08-23T00:00:00Z", requestId: "request-1", count: 8 },
      links: { self: "/canonical" },
    })))

    const document = await loadAnnouncements({ site: "operator" })

    expect(document.meta).toMatchObject({
      servedAt: "2026-08-23T00:00:00Z",
      requestId: "request-1",
      count: 8,
    })
    expect(document.links?.self).toBe("/canonical")
  })

  it("fails open to an empty document for HTTP, transport, and shape failures", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockRejectedValueOnce(new Error("connection refused"))
      .mockResolvedValueOnce(Response.json(["not", "a", "document"]))
    vi.stubGlobal("fetch", fetchMock)

    for (let index = 0; index < 3; index += 1) {
      const document = await loadAnnouncements({ site: "www" })
      expect(document.data).toEqual([])
      expect(document.meta).toMatchObject({ count: 0, requestId: "local-fallback" })
      expect(document.links?.self).toBe("/v1/public/announcements?site=www")
    }
  })
})
