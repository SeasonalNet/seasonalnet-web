import Link from "next/link"
import {
  Activity,
  CloudSun,
  KeyRound,
  Phone,
  Radio,
  type LucideIcon,
} from "lucide-react"

import { AdminModuleCard } from "@/components/admin/admin-module-card"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { AdminModule } from "@/lib/admin/types"

type AdminWorkspaceProps = {
  modules: AdminModule[]
  selectedModuleId?: string
}

function moduleIconFor(moduleId: string): LucideIcon {
  switch (moduleId) {
    case "seasonalweather":
      return CloudSun
    case "seasonalprovisioning":
      return KeyRound
    case "seasonalpbx":
      return Phone
    case "seasonalradio":
      return Radio
    default:
      return Activity
  }
}

function moduleBadge(module: AdminModule) {
  if (module.readiness === "live") return "Live"
  if (module.tags.includes("planned")) return "Planned"
  return "Degraded"
}

function moduleBadgeVariant(module: AdminModule): "secondary" | "outline" {
  return module.readiness === "live" ? "secondary" : "outline"
}

function moduleSubtitle(module: AdminModule) {
  const statusGroup = module.groups.find((group) => group.key === "status")
  const firstStatus = statusGroup?.statusItems?.[0]

  if (firstStatus) return `${firstStatus.label}: ${firstStatus.value}`
  return module.tags.slice(0, 2).join(" · ")
}

export function AdminWorkspace({ modules, selectedModuleId }: AdminWorkspaceProps) {
  const selectedModule =
    modules.find((module) => module.id === selectedModuleId) || modules[0]

  if (!selectedModule) return null

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
      <aside className="lg:sticky lg:top-24">
        <Card className="rounded-3xl bg-card/50">
          <CardContent className="p-4">
            <div className="px-2 py-1">
              <div className="text-sm font-semibold">Modules</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Select a control-plane surface.
              </div>
            </div>

            <Separator className="my-3" />

            <nav className="space-y-1" aria-label="Admin modules">
              {modules.map((module) => {
                const Icon = moduleIconFor(module.id)
                const active = module.id === selectedModule.id

                return (
                  <Link
                    key={module.id}
                    href={`/?module=${module.id}`}
                    className={cn(
                      "group flex items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-colors",
                      active
                        ? "border-foreground/20 bg-foreground text-background"
                        : "border-transparent hover:border-border hover:bg-muted/60",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border",
                        active
                          ? "border-background/25 bg-background/10 text-background"
                          : "bg-background text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {module.title}
                        </span>
                        <Badge
                          variant={moduleBadgeVariant(module)}
                          className={cn(
                            "shrink-0 text-[10px]",
                            active ? "border-background/25 bg-background/10 text-background" : "",
                          )}
                        >
                          {moduleBadge(module)}
                        </Badge>
                      </span>
                      <span
                        className={cn(
                          "mt-1 block truncate text-xs",
                          active ? "text-background/70" : "text-muted-foreground",
                        )}
                      >
                        {moduleSubtitle(module)}
                      </span>
                    </span>
                  </Link>
                )
              })}
            </nav>
          </CardContent>
        </Card>
      </aside>

      <section className="min-w-0">
        <AdminModuleCard module={selectedModule} />
      </section>
    </div>
  )
}
