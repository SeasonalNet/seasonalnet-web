import { readFileSync } from "node:fs"
import path from "node:path"
import { runInNewContext } from "node:vm"

import { describe, expect, it, vi } from "vitest"

const dockerfile = readFileSync(new URL("../../Dockerfile", import.meta.url), "utf8")
const healthCheck = dockerfile.match(/CMD node -e "([^"]+)"/)[1]

function runHealthCheck(fetch) {
  return new Promise((resolve) => {
    runInNewContext(healthCheck, { fetch, AbortSignal, process: { exit: resolve } })
  })
}

describe("container asset layout", () => {
  it.each(["admin", "agent", "docs", "pbx", "prov", "radio", "www"])(
    "places %s assets beside its standalone server",
    (app) => {
      const copies = dockerfile.split("\n")
        .filter((line) => line.startsWith("COPY --from=build"))
        .map((line) => line.replaceAll("${APP}", app).split(/\s+/).slice(-2))
      const serverDirectory = path.posix.dirname(`/app/apps/${app}/server.js`)

      for (const assetDirectory of [".next/static", "public"]) {
        const source = `/repo/apps/${app}/${assetDirectory}`
        const copy = copies.find(([from]) => from === source)
        expect(copy).toBeDefined()
        expect(path.posix.resolve("/app", copy[1])).toBe(
          path.posix.join(serverDirectory, assetDirectory),
        )
      }
    },
  )
})

describe("container health check", () => {
  it.each([200, 204, 299, 301, 302, 303, 304, 307, 308, 399])(
    "accepts HTTP %i",
    async (status) => {
      expect(await runHealthCheck(vi.fn().mockResolvedValue({ status }))).toBe(0)
    },
  )

  it.each([400, 401, 403, 404, 429, 499, 500, 502, 503, 504, 599])(
    "fails HTTP %i",
    async (status) => {
      expect(await runHealthCheck(vi.fn().mockResolvedValue({ status }))).toBe(1)
    },
  )

  it("checks middleware redirects without following them and bounds the request", async () => {
    const fetch = vi.fn().mockResolvedValue({ status: 302 })
    expect(await runHealthCheck(fetch)).toBe(0)
    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledWith("http://127.0.0.1:3000/", {
      redirect: "manual",
      signal: expect.any(AbortSignal),
    })
  })

  it.each([new TypeError("Connection refused"), new DOMException("Timed out", "TimeoutError")])(
    "fails when the HTTP request rejects: %s",
    async (error) => {
      expect(await runHealthCheck(vi.fn().mockRejectedValue(error))).toBe(1)
    },
  )
})
