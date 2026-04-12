// src/components/radio/mount-card.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@seasonalnet/shell/src/components/ui/card"
import { BustedAudio } from "@/components/busted-audio"
import { RADIO_STATIONS } from "@/lib/radio-stations"

type Props = {
  title: string
  src: string
}

function normalizeSrcToPath(src: string): string {
  try {
    if (src.startsWith("http://") || src.startsWith("https://")) {
      const u = new URL(src)
      return u.pathname
    }
  } catch {
    // ignore
  }
  const q = src.indexOf("?")
  return q >= 0 ? src.slice(0, q) : src
}

function findStationByMountSrc(src: string) {
  const path = normalizeSrcToPath(src)
  for (const st of RADIO_STATIONS) {
    if (st.mounts.some((m) => normalizeSrcToPath(m.src) === path)) return st
  }
  return null
}

export function MountCard({ title, src }: Props) {
  const station = findStationByMountSrc(src)
  const metaEnabled = !!station?.metadata?.enabled

  const mediaMeta = station
    ? {
        title,
        artist: station.metadata?.artist ?? station.name,
        album: station.metadata?.album ?? "",
        artworkUrl: station.metadata?.artworkUrl ?? "/brand/logo-white.png",
      }
    : undefined

  const mediaMetaUrl =
    station && metaEnabled
      ? `/api/stations/${encodeURIComponent(station.id)}/metadata?mount=${encodeURIComponent(src)}`
      : undefined

  return (
    <Card className="bg-card/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <BustedAudio src={src} mediaMeta={mediaMeta} mediaMetaUrl={mediaMetaUrl} mediaMetaPollMs={15000} />
        <div className="text-xs text-muted-foreground break-all">{src}</div>
      </CardContent>
    </Card>
  )
}
