import { Shield, Wrench } from "lucide-react"

import type { AdminModule } from "../types"

export function buildSeasonalRadioModule(): AdminModule {
  return {
    id: "seasonalradio",
    title: "SeasonalRadio",
    summary: "Station control, mounts, and metadata tooling.",
    tags: ["radio", "mounts", "planned"],
    readiness: "scaffolded",
    groups: [
      {
        key: "status",
        title: "Status",
        summary: "Mount state, source state, and visibility surfaces.",
        statusItems: [
          { label: "Wiring", value: "Planned", tone: "muted" },
          { label: "Shape", value: "SoA ready", tone: "success" },
        ],
      },
      {
        key: "operations",
        title: "Operations",
        summary: "Runtime station controls and recovery actions.",
        actions: [
          {
            label: "Module scaffold",
            summary: "Waiting on backend adapter work.",
            icon: Wrench,
            state: "scaffolded",
          },
        ],
      },
      {
        key: "administration",
        title: "Administration",
        summary: "Higher-trust station and source changes.",
        actions: [
          {
            label: "Module scaffold",
            summary: "Waiting on backend adapter work.",
            icon: Shield,
            state: "scaffolded",
          },
        ],
      },
    ],
  }
}
