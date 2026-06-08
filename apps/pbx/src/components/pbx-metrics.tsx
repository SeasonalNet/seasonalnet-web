"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import { AlertTriangle, CalendarDays, History, PhoneCall, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@seasonalnet/shell/src/components/ui/card"
import { AnimatedNumber } from "@/components/animated-number"
import { BlurFade } from "@/components/magic/blur-fade"
import { SectionHeader } from "@/components/pbx-section"
import { cn } from "@seasonalnet/shell/src/lib/utils"

type Metrics = {
  enabled: boolean
  generatedAt: string

  extensionCount?: number | null
  callsToday?: number | null
  callsThisMonth?: number | null
  totalCalls?: number | null

  error?: string
}

function Tile({
  title,
  icon: Icon,
  value,
  subtitle,
  className,
}: {
  title: string
  icon: LucideIcon
  value: number | null | undefined
  subtitle: string
  className?: string
}) {
  return (
    <Card className={cn("h-full bg-card/60 transition-all duration-200 hover:-translate-y-1 hover:bg-card/80 hover:shadow-md", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/80 bg-background/80 text-muted-foreground transition-colors group-hover:border-border group-hover:bg-background">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        <div className="text-2xl font-semibold md:text-3xl">
          <AnimatedNumber value={value} />
        </div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </CardContent>
    </Card>
  )
}

export function PBXMetricsPanel() {
  const [data, setData] = useState<Metrics | null>(null)

  const susCounts = useMemo(() => {
    const a = data?.callsToday
    const b = data?.callsThisMonth
    const c = data?.totalCalls
    return typeof a === "number" && typeof b === "number" && typeof c === "number" && a > 0 && a === b && a === c
  }, [data])

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/pbx/metrics", { cache: "no-store" })
      const json = (await res.json()) as Metrics
      setData(json)
    } catch (e: unknown) {
      setData({
        enabled: true,
        generatedAt: new Date().toISOString(),
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }, [])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void load()
    }, 0)
    const interval = window.setInterval(() => {
      void load()
    }, 60_000)

    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
    }
  }, [load])

  if (data && data.enabled === false) {
    return (
      <BlurFade>
        <Card className="bg-card/60">
          <CardHeader>
            <CardTitle className="text-base">PBX metrics</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Metrics are disabled for this deployment.</CardContent>
        </Card>
      </BlurFade>
    )
  }

  const tiles = [
    { title: "Extensions", icon: Users, value: data?.extensionCount, subtitle: "Provisioned endpoints" },
    { title: "Calls today", icon: PhoneCall, value: data?.callsToday, subtitle: "Since midnight" },
    { title: "Calls this month", icon: CalendarDays, value: data?.callsThisMonth, subtitle: "Since the 1st" },
    { title: "All-time calls", icon: History, value: data?.totalCalls, subtitle: "Wide-range count" },
  ]

  return (
    <div className="space-y-5">
      <BlurFade>
        <SectionHeader
          eyebrow="Live stats"
          title="PBX by the numbers"
          description="A compact operational snapshot from the SeasonalPBX stack. Metrics refresh automatically while the page is open."
        />
      </BlurFade>

      <div className="grid gap-4 md:grid-cols-4">
        {tiles.map((tile, index) => (
          <BlurFade key={tile.title} delay={0.04 * index}>
            <Tile {...tile} />
          </BlurFade>
        ))}
      </div>

      {data?.error ? (
        <BlurFade>
          <div className="text-xs text-muted-foreground">Metrics note: {data.error}</div>
        </BlurFade>
      ) : susCounts ? (
        <BlurFade>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            CDR counts are identical across ranges — FreePBX may be returning an unfiltered totalCount.
          </div>
        </BlurFade>
      ) : (
        <BlurFade>
          <div className="text-xs text-muted-foreground">
            Updated {data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : "—"} (refreshes every minute)
          </div>
        </BlurFade>
      )}
    </div>
  )
}
