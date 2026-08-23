import { afterEach, describe, expect, it, vi } from "vitest"

const filesystem = vi.hoisted(() => ({
  readdir: vi.fn(),
  stat: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("fs/promises", () => filesystem)
vi.mock("@seasonalnet/shell/src/lib/server/cache", () => ({
  getCachedValue: async (_policy: unknown, load: () => Promise<unknown>) => ({ value: await load(), state: "miss" }),
}))

const keys = ["SEASONALPROV_ROOT", "SEASONALPROV_PBX_SYNC_ROOT", "SEASONALPROV_PUBLIC_BASE_URL"] as const
const originals = Object.fromEntries(keys.map((key) => [key, process.env[key]]))

async function loadOverview() {
  vi.resetModules()
  process.env.SEASONALPROV_ROOT = "/test/prov"
  process.env.SEASONALPROV_PBX_SYNC_ROOT = "/test/pbx-sync"
  process.env.SEASONALPROV_PUBLIC_BASE_URL = "https://prov.example.test"
  return import("./seasonalprovisioning")
}

function fileEntry(name: string, file = true) {
  return { name, isFile: () => file, isDirectory: () => !file }
}

afterEach(() => {
  vi.clearAllMocks()
  for (const key of keys) {
    const value = originals[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe("SeasonalProvisioning overview", () => {
  it("reports an unavailable provisioning root", async () => {
    filesystem.stat.mockRejectedValue(new Error("missing"))
    const { getSeasonalProvisioningOverview } = await loadOverview()

    await expect(getSeasonalProvisioningOverview()).resolves.toMatchObject({
      configured: true,
      reachable: false,
      rootPath: "/test/prov",
      error: "/test/prov is not available to the admin app runtime.",
    })
  })

  it("inventories public assets while hiding dotfiles", async () => {
    const rootDate = new Date("2026-08-20T00:00:00Z")
    const indexDate = new Date("2026-08-21T00:00:00Z")
    const syncDate = new Date("2026-08-22T00:00:00Z")
    filesystem.stat.mockImplementation((target: string) => {
      if (target === "/test/prov") return Promise.resolve({ isDirectory: () => true, isFile: () => false, mtime: rootDate })
      if (target.endsWith("index.html")) return Promise.resolve({ isDirectory: () => false, isFile: () => true, mtime: indexDate })
      if (target === "/test/pbx-sync") return Promise.resolve({ isDirectory: () => true, isFile: () => false, mtime: syncDate })
      return Promise.reject(new Error("missing"))
    })
    filesystem.readdir.mockImplementation((target: string) => {
      if (target.endsWith("wallpapers")) return Promise.resolve([fileEntry("z.png"), fileEntry(".hidden"), fileEntry("a.png")])
      if (target.endsWith("Desktops")) return Promise.resolve([fileEntry("one"), fileEntry(".hidden")])
      if (target.endsWith("provision_tokens")) return Promise.resolve([fileEntry("one"), fileEntry("two")])
      if (target === "/test/pbx-sync") return Promise.resolve([fileEntry("phones.json")])
      return Promise.reject(new Error("missing"))
    })
    const { getSeasonalProvisioningOverview } = await loadOverview()

    await expect(getSeasonalProvisioningOverview()).resolves.toEqual({
      configured: true,
      reachable: true,
      rootPath: "/test/prov",
      publicBaseUrl: "https://prov.example.test",
      indexPresent: true,
      wallpaperCount: 2,
      wallpaperFiles: ["a.png", "z.png"],
      cmeDesktopCount: 1,
      tokenEntryCount: 2,
      pbxSyncPresent: true,
      pbxSyncEntryCount: 1,
      updatedAt: "2026-08-22T00:00:00.000Z",
    })
  })
})
