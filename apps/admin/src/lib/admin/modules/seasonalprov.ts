import { Shield, Wrench } from "lucide-react"

import type { AdminModule } from "@/lib/admin/types"

export function buildSeasonalProvModule(): AdminModule {
  return {
    id: "seasonalprovisioning",
    title: "SeasonalProvisioning",
    summary: "Provisioning flows, assets, and deployment helpers.",
    tags: ["provision", "assets", "planned"],
    readiness: "scaffolded",
    groups: [
      {
        key: "status",
        title: "Status",
        summary: "Provisioning inventory and sync state.",
        statusItems: [
          { label: "Wiring", value: "Planned", tone: "muted" },
          { label: "Shape", value: "SoA ready", tone: "success" },
        ],
      },
      {
        key: "operations",
        title: "Operations",
        summary: "Workflow controls for day-to-day changes.",
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
        summary: "Sensitive provisioning actions and policy tools.",
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
