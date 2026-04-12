"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@seasonalnet/shell/src/components/ui/card"
import { Users, PhoneCall, CalendarDays, History, AlertTriangle } from "lucide-react"
import { AnimatedNumber } from "@/components/animated-number"

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
}: {
  title: string
  icon: any
  value: number | null | undefined
  subtitle: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        <div className="text-2xl font-semibold">
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

  async function load() {
    try {
      const res = await fetch("/api/pbx/metrics", { cache: "no-store" })
      const json = (await res.json()) as Metrics
      setData(json)
    } catch (e: any) {
      setData({
        enabled: true,
        generatedAt: new Date().toISOString(),
        error: e?.message ?? String(e),
      })
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [])

  if (data && data.enabled === false) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">PBX metrics</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Metrics are disabled for this deployment.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-muted-foreground">PBX by the numbers</div>

      <div className="grid gap-4 md:grid-cols-4">
        <Tile title="Extensions" icon={Users} value={data?.extensionCount} subtitle="Provisioned endpoints" />
        <Tile title="Calls today" icon={PhoneCall} value={data?.callsToday} subtitle="Since midnight" />
        <Tile title="Calls this month" icon={CalendarDays} value={data?.callsThisMonth} subtitle="Since the 1st" />
        <Tile title="All-time calls" icon={History} value={data?.totalCalls} subtitle="Wide-range count" />
      </div>

      {data?.error ? (
        <div className="text-xs text-muted-foreground">Metrics note: {data.error}</div>
      ) : susCounts ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="h-4 w-4" />
          CDR counts are identical across ranges — FreePBX may be returning an unfiltered totalCount.
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">
          Updated {data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : "—"} (refreshes every minute)
        </div>
      )}
    </div>
  )
}
