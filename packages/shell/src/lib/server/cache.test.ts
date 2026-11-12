import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { getCachedValue } from "./cache"

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-08-23T12:00:00Z"))
})

afterEach(() => {
  vi.useRealTimers()
})

describe("getCachedValue", () => {
  it("reports stale when a refresh fails inside the stale window", async () => {
    const key = `stale-test-${crypto.randomUUID()}`
    const options = { key, ttlMs: 1_000, staleTtlMs: 5_000 }

    await expect(getCachedValue(options, async () => "fresh")).resolves.toEqual({ value: "fresh", status: "miss" })
    vi.advanceTimersByTime(1_001)

    await expect(getCachedValue(options, async () => { throw new Error("offline") })).resolves.toEqual({
      value: "fresh",
      status: "stale",
    })
  })

  it("coalesces concurrent cache misses", async () => {
    const key = `coalesce-test-${crypto.randomUUID()}`
    let resolveLoader: ((value: string) => void) | undefined
    const loader = vi.fn(() => new Promise<string>((resolve) => { resolveLoader = resolve }))

    const first = getCachedValue({ key, ttlMs: 1_000 }, loader)
    const second = getCachedValue({ key, ttlMs: 1_000 }, loader)
    resolveLoader?.("loaded")

    await expect(first).resolves.toEqual({ value: "loaded", status: "miss" })
    await expect(second).resolves.toEqual({ value: "loaded", status: "coalesced" })
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it("evicts the oldest value when the cache reaches its limit", async () => {
    const prefix = `capacity-test-${crypto.randomUUID()}`
    const firstLoader = vi.fn(async () => "first")

    await getCachedValue({ key: `${prefix}-0`, ttlMs: 60_000 }, firstLoader)
    for (let index = 1; index <= 256; index += 1) {
      await getCachedValue({ key: `${prefix}-${index}`, ttlMs: 60_000 }, async () => index)
    }
    await getCachedValue({ key: `${prefix}-0`, ttlMs: 60_000 }, firstLoader)

    expect(firstLoader).toHaveBeenCalledTimes(2)
  })
})
