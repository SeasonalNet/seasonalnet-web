import { describe, expect, it } from "vitest"
import { versionConfig } from "./version-config.mjs"

describe("software build identity", () => {
  it("puts the release identity in the browser build, build ID and HTTP headers", async () => {
    const config = versionConfig({ APP_VERSION: "2.3.4-rc.1", APP_REVISION: "abc123" })
    expect(config.env.NEXT_PUBLIC_APP_VERSION).toBe("2.3.4-rc.1")
    expect(config.env.NEXT_PUBLIC_APP_REVISION).toBe("abc123")
    expect(await config.generateBuildId()).toBe("2.3.4-rc.1-abc123")
    expect(await config.headers()).toEqual([{
      source: "/:path*",
      headers: [
        { key: "X-Software-Version", value: "2.3.4-rc.1" },
        { key: "X-Software-Revision", value: "abc123" },
      ],
    }])
  })
  it("uses Git for native builds without supplied CI metadata", async () => {
    const config = versionConfig({})
    expect(config.env.NEXT_PUBLIC_APP_VERSION).toMatch(/^\d+\.\d+\.\d+/)
    expect(config.env.NEXT_PUBLIC_APP_REVISION).toMatch(/^[0-9a-f]{40,64}$/)
    expect(await config.generateBuildId()).toContain(config.env.NEXT_PUBLIC_APP_REVISION)
  })
})
