import { Folder, Image, KeyRound, Server, Shield, Wrench } from "lucide-react"

import type { AdminModule, AdminStatusItem, ModuleTone } from "../types"
import type { SeasonalProvisioningOverview } from "../../server/modules/seasonalprovisioning"

function reachabilityTone(value: boolean): ModuleTone {
  return value ? "success" : "danger"
}

function presentLabel(value: boolean, present = "Present", absent = "Missing") {
  return value ? present : absent
}

function countLabel(value: number | null, unit: string, plural = `${unit}s`) {
  if (value === null) return "Unknown"
  return `${value} ${value === 1 ? unit : plural}`
}

function updatedLabel(value: string | null) {
  if (!value) return "Unknown"
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function wallpaperSummary(overview: SeasonalProvisioningOverview) {
  if (overview.wallpaperCount === null) return "Unknown"
  if (!overview.wallpaperFiles.length) return "0 files"

  const sample = overview.wallpaperFiles.slice(0, 2).join(", ")
  const remaining = overview.wallpaperFiles.length - 2

  return remaining > 0 ? `${overview.wallpaperCount} files · ${sample} +${remaining}` : `${overview.wallpaperCount} files · ${sample}`
}

function seasonalProvisioningStatus(
  overview: SeasonalProvisioningOverview,
): AdminStatusItem[] {
  return [
    {
      label: "Filesystem",
      value: overview.reachable ? "Ready" : "Unavailable",
      tone: overview.configured ? reachabilityTone(overview.reachable) : "muted",
    },
    {
      label: "Root",
      value: overview.rootPath,
      tone: "muted",
    },
    {
      label: "Public URL",
      value: overview.publicBaseUrl,
      tone: "muted",
    },
    {
      label: "Index",
      value: presentLabel(overview.indexPresent),
      tone: overview.indexPresent ? "success" : "warning",
    },
    {
      label: "Wallpapers",
      value: wallpaperSummary(overview),
      tone: overview.wallpaperCount === null ? "muted" : "default",
    },
    {
      label: "CME assets",
      value: countLabel(overview.cmeDesktopCount, "entry", "entries"),
      tone: overview.cmeDesktopCount === null ? "muted" : "default",
    },
    {
      label: "Tokens",
      value: countLabel(overview.tokenEntryCount, "entry", "entries"),
      tone: overview.tokenEntryCount === null ? "muted" : "default",
    },
    {
      label: "PBX sync",
      value: overview.pbxSyncPresent
        ? countLabel(overview.pbxSyncEntryCount, "entry", "entries")
        : "Missing",
      tone: overview.pbxSyncPresent ? "success" : "muted",
    },
    {
      label: "Updated",
      value: updatedLabel(overview.updatedAt),
      tone: "muted",
    },
  ]
}

export function buildSeasonalProvModule(
  overview: SeasonalProvisioningOverview,
): AdminModule {
  const liveActionState = overview.reachable ? "live" : "scaffolded"

  return {
    id: "seasonalprovisioning",
    title: "SeasonalProvisioning",
    summary: overview.error
      ? overview.error
      : "Phone provisioning assets, token-protected files, and PBX sync state.",
    tags: ["provision", "assets", overview.reachable ? "live" : "backend"],
    readiness: overview.reachable ? "live" : "scaffolded",
    groups: [
      {
        key: "status",
        title: "Status",
        summary: "Filesystem inventory for the provisioning service on SeasonalWeb.",
        statusItems: seasonalProvisioningStatus(overview),
      },
      {
        key: "operations",
        title: "Operations",
        summary: "Safe day-to-day provisioning workflows.",
        actions: [
          {
            label: "Inventory refresh",
            summary: "The module refreshes inventory on page load and server refresh.",
            icon: Folder,
            state: liveActionState,
            href: "/api/modules/seasonalprovisioning/overview",
            method: "GET",
          },
          {
            label: "Regenerate phone config",
            summary: "Planned after the config renderer is formalized behind an API.",
            icon: Wrench,
            state: "scaffolded",
          },
          {
            label: "Validate assets",
            summary: "Planned guardrail for wallpapers, desktops, and token files.",
            icon: Image,
            state: "scaffolded",
          },
        ],
      },
      {
        key: "administration",
        title: "Administration",
        summary: "Higher-trust token and provisioning policy controls.",
        actions: [
          {
            label: "Token inventory",
            summary: "Keep token values hidden; show only bounded inventory counts.",
            icon: KeyRound,
            state: "scaffolded",
          },
          {
            label: "Provisioning backend",
            summary: "Future endpoint for write-side provisioning workflows.",
            icon: Server,
            state: "scaffolded",
          },
          {
            label: "Access policy",
            summary: "Future admin policy for token-protected phone config access.",
            icon: Shield,
            state: "scaffolded",
          },
        ],
      },
    ],
  }
}
