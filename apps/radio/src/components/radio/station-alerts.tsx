"use client"

import * as React from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { alertToneClass } from "@/components/radio/alert-event-icon"
import { formatDateTime, safeNavigationHref } from "@seasonalnet/shell/src/lib/browser-safe"
import { TriangleAlert } from "lucide-react"
import { AlertFeedHeader } from "@/components/radio/alert-feed-header"
import { AlertFeedPagination, ALERT_PAGE_SIZE } from "@/components/radio/alert-feed-pagination"
import { RadioAlertCard } from "@/components/radio/radio-alert-card"
import { AlertFeedScroll } from "@/components/radio/alert-feed-scroll"
import { AlertFeedList } from "@/components/radio/alert-feed-list"
import { AlertFeedSkeleton } from "@/components/radio/alert-feed-skeleton"
import { useStationAlertFeed, type ActiveAlertsPayload } from "@/components/radio/station-alert-feeds"

function fmtLocal(ts: string, tz = "America/New_York") {
  return formatDateTime(ts, tz)
}

export function StationAlerts({ stationId, timezone = "America/New_York" }: { stationId: string; timezone?: string }) {
  const [visibleCount, setVisibleCount] = React.useState(ALERT_PAGE_SIZE)

  const { data, error, isFetching, loading, refresh } = useStationAlertFeed<ActiveAlertsPayload>(stationId, "active")

  const alerts = React.useMemo(() => data?.alerts ?? [], [data])
  const last = data?.generatedAt
  const visibleAlerts = React.useMemo(() => alerts.slice(0, visibleCount), [alerts, visibleCount])

  return (
    <section className="space-y-4" aria-busy={isFetching} aria-labelledby={`${stationId}-active-alerts-heading`}>
      <AlertFeedHeader
        id={`${stationId}-active-alerts-heading`}
        title={`Active alerts${alerts.length ? ` · ${alerts.length} products` : ""}`}
        description={`In the area of: ${data?.serviceAreaName ?? "—"} · Updated: ${last ? fmtLocal(last, timezone) : "—"}`}
        loading={isFetching}
        onRefresh={refresh}
      />

      {error ? (
        <Alert>
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Alerts unavailable</AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground">
            Refresh the feed and try again, if nothing changes, this typically mean&apos;s that api.weather.gov is not available at the moment.
          </AlertDescription>
        </Alert>
      ) : loading ? (
        <AlertFeedScroll>
          <AlertFeedSkeleton />
        </AlertFeedScroll>
      ) : alerts.length === 0 ? (
        <Alert>
          <AlertTitle>No alerts are present right now</AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground">
            If something’s definitely going on, it may be an alert type without SAME geocodes, or it hasn’t propagated yet.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3">
          <AlertFeedScroll>
            <AlertFeedList
              items={visibleAlerts}
              renderItem={(a) => {
                const until = a.ends ?? a.expires
                const nwsHref = safeNavigationHref(a.links?.nws)

                return (
                  <RadioAlertCard
                    event={a.event}
                    headline={a.headline}
                    severity={a.severity}
                    area={a.area}
                    until={until ? fmtLocal(until, timezone) : null}
                    href={nwsHref}
                    hrefLabel="NWS"
                    sourceLabel="NWS"
                    toneClass={alertToneClass(a.event, a.severity)}
                  />
                )
              }}
            />
          </AlertFeedScroll>
          <AlertFeedPagination
            total={alerts.length}
            visibleCount={visibleCount}
            onShowMore={() => setVisibleCount((count) => Math.min(count + ALERT_PAGE_SIZE, alerts.length))}
            onShowLess={() => setVisibleCount(ALERT_PAGE_SIZE)}
          />
        </div>
      )}
    </section>
  )
}
