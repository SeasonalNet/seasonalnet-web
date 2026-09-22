"use client"

import * as React from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { TriangleAlert } from "lucide-react"
import {
  alertToneClass,
  alertToneClassEasHandled,
  handledAlertToneModeForSource,
} from "@/components/radio/alert-event-icon"
import { STATION_HANDLED_ALERTS } from "@/lib/station-handled-alert-config"
import { formatDateTime, safeNavigationHref } from "@seasonalnet/shell/src/lib/browser-safe"
import { AlertFeedHeader } from "@/components/radio/alert-feed-header"
import { AlertFeedPagination, ALERT_PAGE_SIZE } from "@/components/radio/alert-feed-pagination"
import { RadioAlertCard } from "@/components/radio/radio-alert-card"
import { AlertFeedScroll } from "@/components/radio/alert-feed-scroll"
import { AlertFeedList } from "@/components/radio/alert-feed-list"
import { AlertFeedSkeleton } from "@/components/radio/alert-feed-skeleton"
import {
  useStationAlertFeed,
  type StationHandledAlertsPayload,
} from "@/components/radio/station-alert-feeds"

function fmtLocal(ts: string, tz = "America/New_York") {
  return formatDateTime(ts, tz)
}

export function StationHandledAlerts({
  stationId,
  timezone = "America/New_York",
  withDivider = false,
}: {
  stationId: string
  timezone?: string
  withDivider?: boolean
}) {
  const cfg = STATION_HANDLED_ALERTS[stationId]
  const pollMs = Math.max(10, Math.floor(cfg?.pollSeconds ?? 60)) * 1000
  const [visibleCount, setVisibleCount] = React.useState(ALERT_PAGE_SIZE)

  const { data, error, isFetching, loading, refresh } = useStationAlertFeed<StationHandledAlertsPayload>(
    stationId,
    "handled",
    { enabled: Boolean(cfg), pollMs },
  )

  const alerts = React.useMemo(() => (data && "alerts" in data ? data.alerts : []) ?? [], [data])
  const visibleAlerts = React.useMemo(() => alerts.slice(0, visibleCount), [alerts, visibleCount])

  if (!cfg) return null

  if (data && "enabled" in data && data.enabled === false) return null

  const last = data?.generatedAt
  const feedError = error ?? data?.error ?? null
  const title = cfg.title ?? "Station Alert Feed"

  return (
    <section className="space-y-4" aria-busy={isFetching} aria-labelledby={`${stationId}-handled-alerts-heading`}>
      <AlertFeedHeader
        id={`${stationId}-handled-alerts-heading`}
        title={`${title}${alerts.length ? ` · ${alerts.length} products` : ""}`}
        description={`Station-handled alerts · Updated: ${last ? fmtLocal(last, timezone) : "—"}`}
        loading={isFetching}
        onRefresh={refresh}
        divider={withDivider}
      />

      {feedError ? (
        <Alert>
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Station feed unavailable</AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground">
            The station&apos;s handled alert feed is currently unavailable or unreachable.
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
            If something’s definitely going on, the station may not have emitted alert entries for it.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3">
          <AlertFeedScroll>
            <AlertFeedList
              items={visibleAlerts}
              renderItem={(a) => {
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
                  <RadioAlertCard
                    event={a.event}
                    headline={a.headline}
                    severity={a.severity}
                    area={a.area}
                    until={until ? fmtLocal(until, timezone) : null}
                    href={href}
                    hrefLabel="Open"
                    sourceLabel={fromLabel ? `${fromLabel}${a.from?.kind ? ` (${a.from.kind})` : ""}` : "Station feed"}
                    toneClass={toneClass}
                    toneMode={toneMode}
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
