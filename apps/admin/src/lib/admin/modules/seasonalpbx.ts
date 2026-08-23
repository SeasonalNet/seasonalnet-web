import { Shield, Wrench } from "lucide-react"

import type { AdminModule } from "../types"

export function buildSeasonalPbxModule(): AdminModule {
  return {
    id: "seasonalpbx",
    title: "SeasonalPBX",
    summary: "PBX state, voice services, and call-control tooling.",
    tags: ["voice", "telecom", "planned"],
    readiness: "scaffolded",
    groups: [
      {
        key: "status",
        title: "Status",
        summary: "Core status surfaces for PBX and voice services.",
        statusItems: [
          { label: "Wiring", value: "Planned", tone: "muted" },
          { label: "Shape", value: "SoA ready", tone: "success" },
        ],
      },
      {
        key: "operations",
        title: "Operations",
        summary: "Runtime service control and maintenance.",
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
        summary: "Provisioning and higher-trust actions.",
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
