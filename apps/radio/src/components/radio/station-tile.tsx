// src/components/radio/station-tile.tsx
import { Badge } from "@seasonalnet/shell/src/components/ui/badge"
import { Separator } from "@seasonalnet/shell/src/components/ui/separator"
import { MountCard } from "@/components/radio/mount-card"
import { StationAlerts } from "@/components/radio/station-alerts"
import { StationHandledAlerts } from "@/components/radio/station-handled-alerts"
import { StationAlertMapSection } from "@/components/radio/station-alert-map-section"
import { STATION_ALERTS } from "@/lib/station-alert-config"
import { STATION_HANDLED_ALERTS } from "@/lib/station-handled-alert-config"
import type { RadioStation } from "@/lib/radio-stations"

export function StationTile({ station }: { station: RadioStation }) {
  const hasServiceAreaAlerts = Boolean(STATION_ALERTS[station.id])
  const hasStationFeedAlerts = Boolean(STATION_HANDLED_ALERTS[station.id])
  const hasAnyAlerts = hasServiceAreaAlerts || hasStationFeedAlerts

  return (
    <div className="station-cluster">
      <section className="rounded-3xl border bg-card/50 p-6 md:p-10">
        <div className="flex flex-wrap items-center gap-2">
          {station.tags?.map((t) => (
            <Badge key={t} variant="secondary">
              {t}
            </Badge>
          ))}
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">{station.name}</h2>
        {station.description ? (
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground md:text-base">{station.description}</p>
        ) : null}
        <Separator className="my-6" />
        <div className="grid gap-4 md:grid-cols-3">
          {station.mounts.map((m) => (
            <MountCard key={m.id} title={m.title} src={m.src} />
          ))}
        </div>

        {/* Service-area map — shown whenever a station has an alert config */}
        {hasServiceAreaAlerts ? (
          <>
            <Separator className="my-8" />
            <StationAlertMapSection stationId={station.id} />
          </>
        ) : null}
      </section>

      {hasAnyAlerts ? (
        <div className="relative mt-24 before:absolute before:-top-[88px] before:left-1/2 before:h-[80px] before:w-[4px] before:-translate-x-1/2 before:rounded-sm before:bg-foreground/32 before:ring-1 before:ring-background/80">
          <section
            className="rounded-3xl border bg-card/50 p-6 md:p-10"
            aria-labelledby={`${station.id}-alert-list-heading`}
          >
            <header className="mb-4">
              <h3 id={`${station.id}-alert-list-heading`} className="text-xl font-semibold tracking-tight">
                {station.name} Alert List
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Service-area and station-handled alerts linked to this station.
              </p>
            </header>
            <Separator className="mb-8" />
            <div className="space-y-8">
              {hasServiceAreaAlerts ? <StationAlerts stationId={station.id} timezone="America/New_York" /> : null}
              {hasStationFeedAlerts ? (
                <StationHandledAlerts
                  stationId={station.id}
                  timezone="America/New_York"
                  withDivider={hasServiceAreaAlerts}
                />
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
