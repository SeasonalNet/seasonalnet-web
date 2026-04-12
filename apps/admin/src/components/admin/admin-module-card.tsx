import {
  Activity,
  Clock3,
  FileText,
  Fingerprint,
  Gauge,
  ListOrdered,
  PlugZap,
  RadioTower,
  Repeat2,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react"

import { AdminActionButton } from "@/components/admin/admin-action-button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { AdminActionControl } from "@/components/admin/admin-action-control"

import type {
  AdminAction,
  AdminGroup,
  AdminModule,
  AdminStatusItem,
  ModuleTone,
} from "@/lib/admin/types"

const SHOW_SCAFFOLDED_ACTIONS = false

function toneClass(tone: ModuleTone = "default") {
  switch (tone) {
    case "muted":
      return "text-muted-foreground"
    case "danger":
      return "text-destructive"
    case "warning":
    case "success":
    case "default":
    default:
      return "text-foreground"
  }
}

function visibleActions(items: AdminAction[] = []) {
  if (SHOW_SCAFFOLDED_ACTIONS) return items
  return items.filter((item) => item.state === "live")
}

function emptyMessageFor(groupKey: AdminGroup["key"]) {
  switch (groupKey) {
    case "operations":
      return "No live operational actions yet."
    case "administration":
      return "No live administrative actions yet."
    case "status":
    default:
      return "No status items available."
  }
}

function groupIconFor(groupKey: AdminGroup["key"]): LucideIcon {
  switch (groupKey) {
    case "status":
      return Activity
    case "operations":
      return Wrench
    case "administration":
      return ShieldCheck
    default:
      return Activity
  }
}

function statusIconFor(label: string): LucideIcon {
  const key = label.trim().toLowerCase()

  if (key === "api") return PlugZap
  if (key === "mode") return Gauge
  if (key === "liquidsoap") return RadioTower
  if (key === "queues") return ListOrdered
  if (key === "live time") return Clock3
  if (key === "rebroadcast") return Repeat2
  if (key === "last product") return FileText
  if (key === "config") return Fingerprint

  return Activity
}

function StatusList({ items }: { items: AdminStatusItem[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const Icon = statusIconFor(item.label)

        return (
          <div
            key={item.label}
            className="flex items-start justify-between gap-3 rounded-xl border bg-background/40 px-3 py-2 text-sm"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="text-muted-foreground">{item.label}</div>
            </div>
            <div className={`text-right font-medium ${toneClass(item.tone)}`}>
              {item.value}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ActionList({ items }: { items: AdminAction[] }) {
  const actions = visibleActions(items)

  if (!actions.length) return null

  return (
    <div className="space-y-2">
      {actions.map((item) => {
        const Icon = item.icon

        return (
          <div key={item.label} className="rounded-xl border bg-background/40 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-background">
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <div className="font-medium leading-tight">{item.label}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {item.summary}
                  </div>
                </div>
              </div>

              <AdminActionControl
                href={item.href}
                method={item.method}
                confirm={item.confirm}
                dialogType={item.dialogType}
                label={item.label}
                summary={item.summary}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function GroupBlock({ group }: { group: AdminGroup }) {
  const actions = visibleActions(group.actions)
  const hasStatus = Boolean(group.statusItems?.length)
  const hasActions = actions.length > 0
  const GroupIcon = groupIconFor(group.key)

  return (
    <section className="space-y-3 rounded-2xl border bg-card/40 p-4">
      <div>
        <div className="flex items-center gap-2">
          <GroupIcon className="h-4 w-4 text-muted-foreground" />
          <div className="text-base font-semibold">{group.title}</div>
        </div>
        <div className="mt-1 text-sm text-muted-foreground">{group.summary}</div>
      </div>

      {hasStatus ? <StatusList items={group.statusItems!} /> : null}
      {hasActions ? <ActionList items={actions} /> : null}

      {!hasStatus && !hasActions ? (
        <div className="rounded-xl border bg-background/40 px-3 py-3 text-sm text-muted-foreground">
          {emptyMessageFor(group.key)}
        </div>
      ) : null}
    </section>
  )
}

export function AdminModuleCard({ module }: { module: AdminModule }) {
  return (
    <Card className="rounded-3xl border bg-card/50">
      <CardContent className="p-6 md:p-10">
        <div className="flex flex-wrap items-center gap-2">
          {module.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}

          {module.readiness !== "live" ? (
            <Badge variant="outline">Degraded</Badge>
          ) : null}
        </div>

        <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
          {module.title}
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground md:text-base">
          {module.summary}
        </p>

        <Separator className="my-6" />

        <div className="space-y-4">
          {module.groups.map((group) => (
            <GroupBlock key={group.key} group={group} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
