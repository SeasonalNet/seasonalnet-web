import { Braces, FileJson, KeyRound, RefreshCcw, Rss, ServerCog, Shield } from "lucide-react"

import type { AdminModule, AdminStatusItem, ModuleTone } from "@/lib/admin/types"
import type { SeasonalApidOverview } from "@/lib/server/modules/seasonalapid"

function boolLabel(value: boolean | null, on = "Ready", off = "Unavailable") {
  if (value === null) return "Unknown"
  return value ? on : off
}

function boolTone(value: boolean | null): ModuleTone {
  if (value === null) return "muted"
  return value ? "success" : "danger"
}

function countLabel(value: number | null, unit: string, plural = `${unit}s`) {
  if (value === null) return "Unknown"
  return `${value} ${value === 1 ? unit : plural}`
}

function servedAtLabel(value: string | null) {
  if (!value) return "Unknown"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unknown"

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function seasonalApidStatus(overview: SeasonalApidOverview): AdminStatusItem[] {
  return [
    {
      label: "API",
      value: overview.reachable
        ? `${overview.healthOk === true ? "Ready" : "Reachable"}${overview.apiVersion ? ` · v${overview.apiVersion}` : ""}`
        : overview.configured
          ? "Offline"
          : "Not wired",
      tone: overview.configured ? (overview.reachable ? "success" : "danger") : "muted",
    },
    {
      label: "Readiness",
      value: boolLabel(overview.readyOk),
      tone: boolTone(overview.readyOk),
    },
    {
      label: "Contract",
      value: overview.openApiVersion
        ? `${overview.openApiVersion}${overview.routeCount !== null ? ` · ${countLabel(overview.routeCount, "route")}` : ""}`
        : "Unknown",
      tone: overview.openApiVersion ? "success" : "warning",
    },
    {
      label: "Announcements",
      value: countLabel(overview.publicAnnouncementCount, "announcement"),
      tone: overview.publicAnnouncementCount === null ? "muted" : "default",
    },
    {
      label: "Updated",
      value: servedAtLabel(overview.publicAnnouncementsServedAt),
      tone: "muted",
    },
    {
      label: "Base URL",
      value: overview.baseUrl,
      tone: "muted",
    },
  ]
}

export function buildSeasonalApidModule(overview: SeasonalApidOverview): AdminModule {
  const liveActionState = overview.reachable ? "live" : "scaffolded"

  return {
    id: "seasonalapid",
    title: "SeasonalAPID",
    summary: overview.error
      ? overview.error
      : "Central API daemon for shared public, internal, admin, and labs endpoints.",
    tags: ["api", "control-plane", overview.reachable ? "live" : "backend"],
    readiness: overview.reachable && overview.readyOk !== false ? "live" : "scaffolded",
    groups: [
      {
        key: "status",
        title: "Status",
        summary: "Daemon liveness, readiness, OpenAPI contract, and public announcement state.",
        statusItems: seasonalApidStatus(overview),
      },
      {
        key: "operations",
        title: "Operations",
        summary: "Safe visibility actions for the central API surface.",
        actions: [
          {
            label: "Refresh overview",
            summary: "Recheck health, readiness, OpenAPI metadata, and public announcements.",
            icon: RefreshCcw,
            state: liveActionState,
            href: "/api/modules/seasonalapid/overview",
            method: "GET",
          },
          {
            label: "OpenAPI contract",
            summary: "Status-only in the admin UI for now; direct contract browsing can stay external.",
            icon: FileJson,
            state: "scaffolded",
          },
          {
            label: "Announcement feed",
            summary: "Status-only in the admin UI until announcement CRUD uses delegated admin auth.",
            icon: Rss,
            state: "scaffolded",
          },
        ],
      },
      {
        key: "administration",
        title: "Administration",
        summary: "Higher-trust APID controls stay scaffolded until user-delegated admin auth is wired.",
        actions: [
          {
            label: "Announcement admin",
            summary: "Future create/update/delete UI for APID-backed announcements.",
            icon: Braces,
            state: "scaffolded",
          },
          {
            label: "Client tokens",
            summary: "Future inventory for service clients without exposing bearer tokens to the browser.",
            icon: KeyRound,
            state: "scaffolded",
          },
          {
            label: "Route policy",
            summary: "Future visibility for public, internal, admin, and labs route policy surfaces.",
            icon: Shield,
            state: "scaffolded",
          },
          {
            label: "Daemon runtime",
            summary: "Future systemd/process state once the admin backend owns a safe runtime adapter.",
            icon: ServerCog,
            state: "scaffolded",
          },
        ],
      },
    ],
  }
}
