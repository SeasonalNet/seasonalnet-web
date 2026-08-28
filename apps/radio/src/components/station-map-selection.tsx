"use client"

import { X } from "lucide-react"
import { Badge } from "@seasonalnet/shell/src/components/ui/badge"
import { Button } from "@seasonalnet/shell/src/components/ui/button"
import { cn } from "@seasonalnet/shell/src/lib/utils"
import type { NwsSeverity } from "@/lib/alert-map-utils"

export type MapAlertSummary = {
  id: string
  kind: "nws" | "station"
  label: string
  severity: NwsSeverity
  area: string
  headline?: string
  until?: string
  source?: string
}

type MapCountySelection = {
  kind: "county"
  id: string
  name: string
  state: string
  severity: NwsSeverity
  alerts: MapAlertSummary[]
}

type MapMarineSelection = {
  kind: "marine"
  id: string
  name: string
  severity: NwsSeverity
  alerts: MapAlertSummary[]
}

type MapAlertSelection = {
  kind: "alert"
  alert: MapAlertSummary
}

export type MapSelection = MapCountySelection | MapMarineSelection | MapAlertSelection

type Props = {
  selection: MapSelection | null
  onClose: () => void
  onSelectAlert: (alert: MapAlertSummary) => void
}

function severityVariant(severity: NwsSeverity): "default" | "secondary" | "destructive" | "outline" {
  if (severity === "Extreme" || severity === "Severe") return "destructive"
  if (severity === "Moderate") return "default"
  if (severity === "Minor") return "secondary"
  return "outline"
}

function AlertRow({ alert, onSelect }: { alert: MapAlertSummary; onSelect: () => void }) {
  return (
    <div className="rounded-md border border-border/70 px-2.5 py-2">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-2 text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onSelect}
      >
        <span className="min-w-0 flex-1 text-xs font-medium">{alert.label}</span>
        <Badge variant={severityVariant(alert.severity)} className="shrink-0 text-[10px]">
          {alert.severity}
        </Badge>
      </button>
      {alert.source ? <div className="mt-1 text-[11px] text-muted-foreground">Source: {alert.source}</div> : null}
      {alert.area ? <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{alert.area}</div> : null}
      {alert.until ? <div className="mt-0.5 text-[11px] text-muted-foreground">Until {alert.until}</div> : null}
      {alert.headline ? (
        <details className="mt-1.5 text-[11px] text-muted-foreground">
          <summary className="cursor-pointer select-none hover:text-foreground">Show alert text</summary>
          <p className="mt-1 whitespace-pre-wrap leading-relaxed">{alert.headline}</p>
        </details>
      ) : null}
    </div>
  )
}

export function StationMapSelection({ selection, onClose, onSelectAlert }: Props) {
  if (!selection) return null

  const isArea = selection.kind === "county" || selection.kind === "marine"
  const title = selection.kind === "county"
    ? `${selection.name}, ${selection.state}`
    : selection.kind === "marine"
      ? selection.name
      : selection.alert.label
  const subtitle = isArea
    ? `${selection.alerts.length} alert${selection.alerts.length === 1 ? "" : "s"} mapped here`
    : selection.alert.area

  return (
    <section
      className={cn(
        "absolute bottom-3 left-3 z-[1001] max-h-[min(11rem,calc(100%-4.5rem))] w-[min(23rem,calc(100%-4.5rem))] overflow-y-auto rounded-md border border-border bg-background/95 p-2.5 shadow-lg backdrop-blur-sm",
        "text-foreground"
      )}
      aria-label={selection.kind === "county" ? "Selected county details" : selection.kind === "marine" ? "Selected marine zone details" : "Selected alert details"}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label="Close map selection">
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>

      {isArea ? (
        <div className="mt-1 space-y-1">
          {selection.alerts.length > 0 ? (
            selection.alerts.map((alert) => (
              <AlertRow key={`${alert.kind}:${alert.id}`} alert={alert} onSelect={() => onSelectAlert(alert)} />
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No alert details are available for this county.</p>
          )}
        </div>
      ) : (
        <div className="mt-2">
          <AlertRow alert={selection.alert} onSelect={() => undefined} />
        </div>
      )}
    </section>
  )
}
