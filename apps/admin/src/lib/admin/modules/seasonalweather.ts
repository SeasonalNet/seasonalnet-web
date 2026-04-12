import {
  Activity,
  AlertTriangle,
  AudioLines,
  RefreshCcw,
  Siren,
  Upload,
  Waves,
  Wrench,
} from "lucide-react"

import type { AdminModule, AdminStatusItem, ModuleTone } from "@/lib/admin/types"
import type { SeasonalWeatherOverview } from "@/lib/server/modules/seasonalweather"

function boolLabel(value: boolean | null, on = "Enabled", off = "Disabled") {
  if (value === null) return "Unknown"
  return value ? on : off
}

function boolTone(value: boolean | null): ModuleTone {
  if (value === null) return "muted"
  return value ? "success" : "warning"
}

function reachabilityTone(value: boolean): ModuleTone {
  return value ? "success" : "danger"
}

function queueSummary(overview: SeasonalWeatherOverview) {
  const { nwws, cap, ern } = overview.queueSizes
  if (nwws === null || cap === null || ern === null) return "Unknown"
  return `NWWS ${nwws} · CAP ${cap} · ERN ${ern}`
}

function shortHash(hash: string | null) {
  if (!hash) return "Unknown"
  return `${hash.slice(0, 12)}…`
}

function seasonalWeatherStatus(overview: SeasonalWeatherOverview): AdminStatusItem[] {
  return [
    {
      label: "API",
      value: overview.reachable
        ? `Ready${overview.apiVersion ? ` · v${overview.apiVersion}` : ""}`
        : overview.configured
          ? "Offline"
          : "Not wired",
      tone: overview.configured ? reachabilityTone(overview.reachable) : "muted",
    },
    {
      label: "Mode",
      value: overview.mode ? overview.mode : overview.configured ? "Unknown" : "Pending",
      tone: overview.mode === "heightened" ? "warning" : "default",
    },
    {
      label: "Liquidsoap",
      value:
        overview.liquidsoapReachable === null
          ? "Unknown"
          : overview.liquidsoapReachable
            ? "Reachable"
            : "Unreachable",
      tone:
        overview.liquidsoapReachable === null
          ? "muted"
          : reachabilityTone(overview.liquidsoapReachable),
    },
    {
      label: "Queues",
      value: queueSummary(overview),
      tone: "muted",
    },
    {
      label: "Live time",
      value: boolLabel(overview.liveTimeEnabled, "Enabled", "Disabled"),
      tone: boolTone(overview.liveTimeEnabled),
    },
    {
      label: "Rebroadcast",
      value: boolLabel(overview.rebroadcastEnabled, "Enabled", "Disabled"),
      tone: boolTone(overview.rebroadcastEnabled),
    },
    {
      label: "Last product",
      value: overview.lastProduct || "Waiting",
      tone: "muted",
    },
    {
      label: "Config",
      value: shortHash(overview.configHash),
      tone: "muted",
    },
  ]
}

export function buildSeasonalWeatherModule(
  overview: SeasonalWeatherOverview,
): AdminModule {
  const canControl = overview.configured
  const liveActionState = canControl ? "live" : "scaffolded"

  return {
    id: "seasonalweather",
    title: "SeasonalWeather",
    summary: overview.error
      ? overview.error
      : "Broadcast automation, monitoring, and runtime control.",
    tags: [
      "weather",
      "automation",
      overview.reachable ? "live" : overview.configured ? "backend" : "scaffolded",
    ],
    readiness: overview.reachable ? "live" : "scaffolded",
    groups: [
      {
        key: "status",
        title: "Status",
        summary: "State, feed, queues, and command visibility.",
        statusItems: seasonalWeatherStatus(overview),
      },
      {
        key: "operations",
        title: "Operations",
        summary: "Runtime control for station behavior.",
        actions: [
          {
            label: "Rebuild cycle",
            summary: "Refill the running cycle.",
            icon: RefreshCcw,
            state: liveActionState,
            href: "/api/modules/seasonalweather/cycle/rebuild",
            method: "POST",
            confirm: "Rebuild the SeasonalWeather cycle now?",
          },
          {
            label: "Enable heightened mode",
            summary: "Shift the station into heightened behavior.",
            icon: AlertTriangle,
            tone: "warning",
            state: liveActionState,
            href: "/api/modules/seasonalweather/mode/heightened",
            method: "POST",
            dialogType: "heightened-mode",
          },
          {
            label: "Return to normal mode",
            summary: "Clear heightened mode and resume normal operation.",
            icon: Waves,
            state: liveActionState,
            href: "/api/modules/seasonalweather/mode/heightened/clear",
            method: "DELETE",
            confirm: "Return SeasonalWeather to normal mode?",
          },
        ],
      },
      {
        key: "administration",
        title: "Administration",
        summary: "Higher control and origination tools.",
        actions: [
          {
            label: "Originate test",
            summary: "Start a controlled test path.",
            icon: Siren,
            state: liveActionState,
            href: "/api/modules/seasonalweather/tests/originate",
            method: "POST",
            dialogType: "originate-test",
          },
          {
            label: "Upload audio",
            summary: "Stage a normalized WAV asset.",
            icon: Upload,
            state: liveActionState,
            href: "/api/modules/seasonalweather/uploads/audio",
            method: "POST",
            dialogType: "upload-audio",
          },
          {
            label: "Originate text",
            summary: "Push manual text origination.",
            icon: AudioLines,
            state: liveActionState,
            href: "/api/modules/seasonalweather/originate/text",
            method: "POST",
            dialogType: "originate-text",
          },
          {
            label: "Originate audio",
            summary: "Push staged audio to air.",
            icon: Activity,
            state: liveActionState,
            href: "/api/modules/seasonalweather/originate/audio",
            method: "POST",
            dialogType: "originate-audio",
          },
          {
            label: "Reload config",
            summary: "Hot-apply safe config changes.",
            icon: Wrench,
            tone: "warning",
            state: liveActionState,
            href: "/api/modules/seasonalweather/config/reload",
            method: "POST",
            confirm: "Reload SeasonalWeather config now?",
          },
        ],
      },
    ],
  }
}
