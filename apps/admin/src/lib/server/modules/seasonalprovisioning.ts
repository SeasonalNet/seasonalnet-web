import "server-only"

import { readdir, stat } from "fs/promises"
import path from "path"

import { getCachedValue } from "@seasonalnet/shell/src/lib/server/cache"

export type SeasonalProvisioningOverview = {
  configured: boolean
  reachable: boolean
  rootPath: string
  publicBaseUrl: string
  indexPresent: boolean
  wallpaperCount: number | null
  wallpaperFiles: string[]
  cmeDesktopCount: number | null
  tokenEntryCount: number | null
  pbxSyncPresent: boolean
  pbxSyncEntryCount: number | null
  updatedAt: string | null
  error?: string
}

const PROV_ROOT = process.env.SEASONALPROV_ROOT || "/srv/prov"
const PBX_SYNC_ROOT = process.env.SEASONALPROV_PBX_SYNC_ROOT || "/srv/pbx-sync"
const PUBLIC_BASE_URL = process.env.SEASONALPROV_PUBLIC_BASE_URL || "https://prov.seasonalnet.org"

async function safeStat(targetPath: string) {
  try {
    return await stat(targetPath)
  } catch {
    return null
  }
}

async function directoryEntries(targetPath: string) {
  try {
    return await readdir(targetPath, { withFileTypes: true })
  } catch {
    return null
  }
}

function newestDate(current: Date | null, candidate: Date | null) {
  if (!candidate) return current
  if (!current || candidate > current) return candidate
  return current
}

function countEntries(entries: Awaited<ReturnType<typeof directoryEntries>>) {
  if (!entries) return null
  return entries.filter((entry) => !entry.name.startsWith(".")).length
}

async function getSeasonalProvisioningOverviewFresh(): Promise<SeasonalProvisioningOverview> {
  const rootStat = await safeStat(PROV_ROOT)

  if (!rootStat?.isDirectory()) {
    return {
      configured: true,
      reachable: false,
      rootPath: PROV_ROOT,
      publicBaseUrl: PUBLIC_BASE_URL,
      indexPresent: false,
      wallpaperCount: null,
      wallpaperFiles: [],
      cmeDesktopCount: null,
      tokenEntryCount: null,
      pbxSyncPresent: false,
      pbxSyncEntryCount: null,
      updatedAt: null,
      error: `${PROV_ROOT} is not available to the admin app runtime.`,
    }
  }

  const indexStat = await safeStat(path.join(PROV_ROOT, "index.html"))
  const wallpaperEntries = await directoryEntries(path.join(PROV_ROOT, "wallpapers"))
  const cmeDesktopEntries = await directoryEntries(path.join(PROV_ROOT, "cme", "Desktops"))
  const tokenEntries = await directoryEntries(path.join(PROV_ROOT, "provision_tokens"))
  const pbxSyncStat = await safeStat(PBX_SYNC_ROOT)
  const pbxSyncEntries = pbxSyncStat?.isDirectory() ? await directoryEntries(PBX_SYNC_ROOT) : null

  let updatedAt = newestDate(null, rootStat.mtime)
  updatedAt = newestDate(updatedAt, indexStat?.mtime ?? null)
  updatedAt = newestDate(updatedAt, pbxSyncStat?.mtime ?? null)

  const wallpaperFiles = (wallpaperEntries || [])
    .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))

  return {
    configured: true,
    reachable: true,
    rootPath: PROV_ROOT,
    publicBaseUrl: PUBLIC_BASE_URL,
    indexPresent: Boolean(indexStat?.isFile()),
    wallpaperCount: wallpaperFiles.length,
    wallpaperFiles,
    cmeDesktopCount: countEntries(cmeDesktopEntries),
    tokenEntryCount: countEntries(tokenEntries),
    pbxSyncPresent: Boolean(pbxSyncStat?.isDirectory()),
    pbxSyncEntryCount: countEntries(pbxSyncEntries),
    updatedAt: updatedAt ? updatedAt.toISOString() : null,
  }
}

export async function getSeasonalProvisioningOverview(): Promise<SeasonalProvisioningOverview> {
  const cached = await getCachedValue(
    {
      key: "admin:seasonalprovisioning:overview",
      ttlMs: 10_000,
      staleTtlMs: 60_000,
    },
    getSeasonalProvisioningOverviewFresh,
  )

  return cached.value
}
