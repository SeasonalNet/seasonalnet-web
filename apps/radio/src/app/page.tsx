// src/app/page.tsx

import { Badge } from "@seasonalnet/shell/src/components/ui/badge"
import { Separator } from "@seasonalnet/shell/src/components/ui/separator"
import { StationTile } from "@/components/radio/station-tile"
import { RADIO_STATIONS } from "@/lib/radio-stations"
import { SiteFooter } from "@/components/site-footer"

export default function Page() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-10">
      <section className="pt-10 space-y-6">
        {/* Top "SeasonalRadio" hero card (keep your current style) */}
        <div className="rounded-3xl border bg-card/50 p-6 md:p-10">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">stream</Badge>
            <Badge variant="secondary">stations</Badge>
            <Badge variant="secondary">self-hosted</Badge>
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">SeasonalRadio</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Direct mounts to all of our stations + a simple UI. No autoplay. No nonsense. Just vibes.
          </p>

          <Separator className="my-6" />

          <p className="text-sm text-muted-foreground md:text-base">
            Current stations: <span className="text-foreground/90">{RADIO_STATIONS.length}</span>
          </p>
        </div>

        {/* Station tiles */}
        <div className="space-y-6">
          {RADIO_STATIONS.map((s) => (
            <StationTile key={s.id} station={s} />
          ))}
        </div>
      </section>
        <div className="mt-10">
      <SiteFooter />
    </div>

</main>
  )
}
