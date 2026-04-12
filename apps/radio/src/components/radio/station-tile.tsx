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

      {hasAnyAlerts ? (
        <>
          <Separator className="my-8" />
          {/* Service-area alerts (NWS) */}
          {hasServiceAreaAlerts ? (
            <StationAlerts stationId={station.id} timezone="America/New_York" />
          ) : null}
          {/* Station-handled alerts (station feed) */}
          {hasStationFeedAlerts ? (
            <StationHandledAlerts stationId={station.id} timezone="America/New_York" />
          ) : null}
        </>
      ) : null}
    </section>
  )
}
