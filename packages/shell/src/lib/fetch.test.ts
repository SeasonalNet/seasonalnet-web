import { afterEach, describe, expect, it, vi } from "vitest"

import { fetchWithTimeout, isTimeoutError } from "./fetch"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("fetchWithTimeout", () => {
  it("aborts a request that exceeds its ceiling", async () => {
    vi.stubGlobal("fetch", vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true })
    })))

    await expect(fetchWithTimeout("https://example.test", {}, 5)).rejects.toSatisfy(isTimeoutError)
  })

  it("preserves caller cancellation", async () => {
    const controller = new AbortController()
    vi.stubGlobal("fetch", vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true })
    })))

    const pending = fetchWithTimeout("https://example.test", { signal: controller.signal }, 1_000)
    controller.abort(new DOMException("cancelled", "AbortError"))

    await expect(pending).rejects.toMatchObject({ name: "AbortError" })
  })
})
