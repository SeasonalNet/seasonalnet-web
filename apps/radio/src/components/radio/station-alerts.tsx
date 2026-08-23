"use client"

import * as React from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@seasonalnet/shell/src/components/ui/badge"
import { Button } from "@seasonalnet/shell/src/components/ui/button"
import { AlertEventIcon, alertToneClass } from "@/components/radio/alert-event-icon"
import { cn } from "@seasonalnet/shell/src/lib/utils"
import { fetchWithTimeout } from "@seasonalnet/shell/src/lib/fetch"
import { formatDateTime, safeNavigationHref } from "@seasonalnet/shell/src/lib/browser-safe"
import { ExternalLink, RefreshCw, TriangleAlert } from "lucide-react"

type ApiAlert = {
  id: string
  event: string
  headline: string
  severity: string
  urgency: string
  certainty: string
  area: string
  effective: string | null
  ends: string | null
  expires: string | null
  sent: string | null
  links: { nws: string }
}

type ApiPayload = {
  stationId: string
  serviceAreaName: string
  generatedAt: string
  source: "nws"
  alerts: ApiAlert[]
}

function fmtLocal(ts: string, tz = "America/New_York") {
  return formatDateTime(ts, tz)
}

function severityVariant(sev: string): "default" | "secondary" | "destructive" | "outline" {
  if (sev === "Extreme" || sev === "Severe") return "destructive"
  if (sev === "Moderate") return "default"
  if (sev === "Minor") return "secondary"
  return "outline"
}

export function StationAlerts({ stationId, timezone = "America/New_York" }: { stationId: string; timezone?: string }) {
  const [data, setData] = React.useState<ApiPayload | null>(null)
  const [err, setErr] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetchWithTimeout(`/api/stations/${encodeURIComponent(stationId)}/alerts`, { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as ApiPayload
      setData(json)
    } catch (error: unknown) {
      setErr(error instanceof Error ? error.message : "Failed to load alerts")
    } finally {
      setLoading(false)
    }
  }, [stationId])

  React.useEffect(() => {
    const initialId = window.setTimeout(() => void load(), 0)
    const t = setInterval(load, 60_000)
    return () => {
      window.clearTimeout(initialId)
      clearInterval(t)
    }
  }, [load])

  const alerts = data?.alerts ?? []
  const last = data?.generatedAt

  return (
    <div className="mt-6 space-y-3">
      {/* Header outside (no tag/pill) */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="text-sm font-medium">Active alerts</div>
          <div className="text-xs text-muted-foreground">
            Service area: {data?.serviceAreaName ?? "—"} · Updated: {last ? fmtLocal(last, timezone) : "—"}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          className="gap-2 self-start sm:self-auto shrink-0"
        >
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      </div>

      {/* No outer container box here — ONLY the Alert cards are boxed */}
      {err ? (
        <Alert>
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Alerts unavailable</AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground">
            {err}. This usually means api.weather.gov is rate-limiting or having a moment.
          </AlertDescription>
        </Alert>
      ) : alerts.length === 0 ? (
        <Alert>
          <AlertTitle>No active alerts in the service area</AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground">
            If something’s definitely going on, it may be an alert type without SAME geocodes, or it hasn’t propagated yet.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3">
          {alerts.slice(0, 12).map((a) => {
            const until = a.ends ?? a.expires
            const nwsHref = safeNavigationHref(a.links?.nws)

            return (
              <Alert key={a.id} className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <AlertTitle className={cn("min-w-0 flex items-center gap-2 leading-tight", alertToneClass(a.event, a.severity))}>
                        <AlertEventIcon event={a.event} severity={a.severity} />
                        <span className="truncate">{a.event}</span>
                      </AlertTitle>

                      <Badge variant={severityVariant(a.severity)} className="shrink-0">
                        {a.severity}
                      </Badge>
                    </div>

                    {a.headline ? <div className="break-words text-sm text-muted-foreground">{a.headline}</div> : null}

                    <div className="text-sm">
                      <span className="font-medium">For:</span>{" "}
                      <span className="text-muted-foreground">{a.area || "—"}</span>
                    </div>

                    <div className="text-sm">
                      <span className="font-medium">Until:</span>{" "}
                      <span className="text-muted-foreground">{until ? fmtLocal(until, timezone) : "—"}</span>
                    </div>
                  </div>

                  {nwsHref ? (
                    <Button variant="ghost" size="sm" className="gap-2 shrink-0 self-end sm:self-start" asChild>
                      <a href={nwsHref} target="_blank" rel="noreferrer noopener" aria-label="Open this alert on NWS">
                        <ExternalLink className="h-4 w-4" />
                        <span className="hidden sm:inline">NWS</span>
                      </a>
                    </Button>
                  ) : null}
                </div>
              </Alert>
            )
          })}
        </div>
      )}
    </div>
  )
}
