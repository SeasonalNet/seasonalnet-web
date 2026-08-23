"use client"

import * as React from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@seasonalnet/shell/src/components/ui/badge"
import { Button } from "@seasonalnet/shell/src/components/ui/button"
import { cn } from "@seasonalnet/shell/src/lib/utils"
import { ExternalLink, RefreshCw, TriangleAlert } from "lucide-react"
import {
  AlertEventIcon,
  alertToneClass,
  alertToneClassEasHandled,
  handledAlertToneModeForSource,
} from "@/components/radio/alert-event-icon"
import { STATION_HANDLED_ALERTS } from "@/lib/station-handled-alert-config"
import { fetchWithTimeout } from "@seasonalnet/shell/src/lib/fetch"
import { formatDateTime, safeNavigationHref } from "@seasonalnet/shell/src/lib/browser-safe"

type FeedSender = { name: string; kind?: "relay" | "origin" | "unknown" }

type StationFeedAlert = {
  id: string
  event: string
  headline: string
  severity: string
  urgency: string
  certainty: string
  area: string
  effective?: string | null
  ends: string | null
  expires: string | null
  sent?: string | null
  sameCodes?: string[]
  source?: string | null
  from: FeedSender | null
  links?: { primary?: string; nws?: string }
}

type Payload =
  | { ok: true; enabled: true; stationId: string; generatedAt: string; source: string; alerts: StationFeedAlert[] }
  | {
      ok?: false
      enabled: true
      stationId: string
      generatedAt: string
      source: string
      error?: string
      alerts: StationFeedAlert[]
    }
  | { ok: true; enabled: false; stationId: string; generatedAt: string; source: string; alerts: StationFeedAlert[] }

function fmtLocal(ts: string, tz = "America/New_York") {
  return formatDateTime(ts, tz)
}

function severityVariant(sev: string): "default" | "secondary" | "destructive" | "outline" {
  if (sev === "Extreme" || sev === "Severe") return "destructive"
  if (sev === "Moderate") return "default"
  if (sev === "Minor") return "secondary"
  return "outline"
}

export function StationHandledAlerts({
  stationId,
  timezone = "America/New_York",
}: {
  stationId: string
  timezone?: string
}) {
  const cfg = STATION_HANDLED_ALERTS[stationId]
  const pollMs = Math.max(10, Math.floor(cfg?.pollSeconds ?? 60)) * 1000

  const [data, setData] = React.useState<Payload | null>(null)
  const [loading, setLoading] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!cfg) return
    setLoading(true)
    try {
      const res = await fetchWithTimeout(`/api/stations/${encodeURIComponent(stationId)}/handled-alerts`, { cache: "no-store" })
      const j = (await res.json()) as Payload
      setData(j)
    } catch {
      setData({
        ok: false,
        enabled: true,
        stationId,
        source: "station_feed",
        generatedAt: new Date().toISOString(),
        error: "fetch failed",
        alerts: [],
      })
    } finally {
      setLoading(false)
    }
  }, [cfg, stationId])

  React.useEffect(() => {
    const initialId = window.setTimeout(() => void load(), 0)
    const t = setInterval(load, pollMs)
    return () => {
      window.clearTimeout(initialId)
      clearInterval(t)
    }
  }, [load, pollMs])

  if (!cfg) return null

  if (data && "enabled" in data && data.enabled === false) return null

  const alerts = (data && "alerts" in data ? data.alerts : []) ?? []
  const last = data?.generatedAt
  const err = data && "error" in data ? data.error : undefined
  const title = cfg.title ?? "Station Alert Feed"

  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">
            Station-handled alerts · Updated: {last ? fmtLocal(last, timezone) : "—"}
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 self-start sm:self-auto shrink-0">
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      </div>

      {err ? (
        <Alert>
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Station feed unavailable</AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground">{err}.</AlertDescription>
        </Alert>
      ) : alerts.length === 0 ? (
        <Alert>
          <AlertTitle>No station-handled alerts right now</AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground">
            If something’s definitely going on, the station may not have emitted handled-alert entries for it.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3">
          {alerts.slice(0, 12).map((a) => {
            const until = a.ends ?? a.expires
            const href = safeNavigationHref(a.links?.primary ?? a.links?.nws)
            const fromLabel = a.from?.name ?? ""
            const toneMode = handledAlertToneModeForSource({
              feedSource: data?.source,
              alertSource: a.source,
              from: a.from,
            })
            const toneClass = toneMode === "eas"
              ? alertToneClassEasHandled(a.event, a.severity)
              : alertToneClass(a.event, a.severity)

            return (
              <Alert key={a.id} className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <AlertTitle className={cn("min-w-0 flex items-center gap-2 leading-tight", toneClass)}>
                        <AlertEventIcon event={a.event} severity={a.severity} mode={toneMode} />
                        <span className="truncate">{a.event}</span>
                      </AlertTitle>

                      <Badge variant={severityVariant(a.severity)} className="shrink-0">
                        {a.severity}
                      </Badge>

                      {fromLabel ? (
                        <Badge variant="outline" className="text-xs">
                          {fromLabel}{a.from?.kind ? ` (${a.from.kind})` : ""}
                        </Badge>
                      ) : null}
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

                  {href ? (
                    <Button variant="ghost" size="sm" className="gap-2 shrink-0 self-end sm:self-start" asChild>
                      <a href={href} target="_blank" rel="noreferrer noopener" aria-label="Open this alert">
                        <ExternalLink className="h-4 w-4" />
                        <span className="hidden sm:inline">Open</span>
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
