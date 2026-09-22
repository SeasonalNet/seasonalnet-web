"use client"

import * as React from "react"
import { Button } from "@seasonalnet/shell/src/components/ui/button"
import { Skeleton } from "@seasonalnet/shell/src/components/ui/skeleton"
import { RefreshCw } from "lucide-react"
import StationMap from "@/components/station-map"
import { STATION_ALERTS } from "@/lib/station-alert-config"
import { STATION_HANDLED_ALERTS } from "@/lib/station-handled-alert-config"
import type { NwsAlertFeature, StationHandledAlert as MapStationHandledAlert } from "@/lib/alert-map-utils"
import {
  useStationAlertFeed,
  type ActiveAlert,
  type ActiveAlertsPayload,
  type StationHandledAlert as StationFeedAlert,
  type StationHandledAlertsPayload,
} from "@/components/radio/station-alert-feeds"

function normaliseCapAlerts(alerts: ActiveAlert[]): NwsAlertFeature[] {
  return alerts.map((alert) => ({
    id: alert.id,
    type: "Feature" as const,
    geometry: alert.geometry ?? null,
    properties: {
      id: alert.id,
      event: alert.event,
      severity: alert.severity as NwsAlertFeature["properties"]["severity"],
      urgency: alert.urgency as NwsAlertFeature["properties"]["urgency"],
      certainty: alert.certainty,
      nwsHeadline: alert.nwsHeadline ?? null,
      headline: alert.headline,
      description: alert.description ?? null,
      instruction: alert.instruction ?? null,
      areaDesc: alert.area,
      effective: alert.effective ?? "",
      expires: alert.expires ?? alert.ends ?? "",
      senderName: "",
      status: "Actual",
      messageType: "Alert",
      parameters: { SAME: alert.sameCodes ?? [] },
    },
  }))
}

function normaliseHandledAlerts(alerts: StationFeedAlert[]): MapStationHandledAlert[] {
  return alerts.map((alert) => ({
    id: alert.id,
    eventType: alert.event,
    severity: alert.severity,
    source: alert.source ?? alert.from?.name,
    areaDesc: alert.area,
    headline: alert.headline,
    sameCodes: alert.sameCodes ?? [],
    fipsCodes: [],
    effective: alert.effective ?? undefined,
    expires: alert.ends ?? alert.expires ?? undefined,
  }))
}

export function StationAlertMapSection({ stationId }: { stationId: string }) {
  const config = STATION_ALERTS[stationId]
  const handledConfig = STATION_HANDLED_ALERTS[stationId]
  const mapContainerRef = React.useRef<HTMLDivElement>(null)
  const [mapVisible, setMapVisible] = React.useState(false)

  React.useEffect(() => {
    const element = mapContainerRef.current
    if (!element) return

    if (typeof IntersectionObserver === "undefined") {
      const initialId = window.setTimeout(() => setMapVisible(true), 0)
      return () => window.clearTimeout(initialId)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setMapVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "600px 0px" },
    )
    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  const activeFeed = useStationAlertFeed<ActiveAlertsPayload>(stationId, "active", { enabled: mapVisible })
  const handledFeed = useStationAlertFeed<StationHandledAlertsPayload>(stationId, "handled", {
    enabled: mapVisible && Boolean(handledConfig),
    pollMs: Math.max(10, Math.floor(handledConfig?.pollSeconds ?? 60)) * 1000,
  })

  const capAlerts = React.useMemo(
    () => normaliseCapAlerts(activeFeed.data?.alerts ?? []),
    [activeFeed.data],
  )
  const handledAlerts = React.useMemo(
    () => normaliseHandledAlerts(handledFeed.data?.alerts ?? []),
    [handledFeed.data],
  )
  const loading = mapVisible && (activeFeed.isFetching || handledFeed.isFetching)
  const error = mapVisible ? activeFeed.error ?? handledFeed.error : null
  const updatedAt = activeFeed.data?.generatedAt ?? handledFeed.data?.generatedAt
  const refreshActive = activeFeed.refresh
  const refreshHandled = handledFeed.refresh
  const load = React.useCallback(() => {
    refreshActive()
    refreshHandled()
  }, [refreshActive, refreshHandled])

  if (!config) return null

  return (
    <div ref={mapContainerRef} className="mt-6 space-y-3" aria-busy={loading}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="text-sm font-medium">Service Area Map</div>
          <div className="text-xs text-muted-foreground">
            {config.serviceAreaName}
            {updatedAt && ` · Updated: ${new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          className="gap-2 self-start shrink-0 sm:self-auto"
        >
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {mapVisible ? (
        <StationMap config={config} capAlerts={capAlerts} handledAlerts={handledAlerts} />
      ) : (
        <div
          className="w-full rounded-md border border-border bg-muted/30"
          style={{ height: 340 }}
          role="status"
          aria-label="Map will load when it approaches the viewport"
        >
          <Skeleton className="h-full w-full rounded-md" />
        </div>
      )}
    </div>
  )
}
