"use client"

import * as React from "react"
import { Megaphone, ExternalLink } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type SiteAnnouncement = {
  id: string
  title: string
  body: string
  level?: "info" | "success" | "warning" | "critical" | "danger"
  href?: string | null
  hrefLabel?: string | null
}

function levelBadge(level?: SiteAnnouncement["level"]) {
  switch (level) {
    case "success":
      return { label: "Live", variant: "default" as const }
    case "warning":
      return { label: "Heads up", variant: "secondary" as const }
    case "critical":
    case "danger":
      return { label: "Important", variant: "destructive" as const }
    case "info":
    default:
      return { label: "Notice", variant: "outline" as const }
  }
}

export function SiteAnnouncements({ className }: { className?: string }) {
  const [items, setItems] = React.useState<SiteAnnouncement[]>([])
  const [loaded, setLoaded] = React.useState(false)

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/announcements", { cache: "no-store" })
      if (!res.ok) return
      const data = (await res.json()) as { data?: SiteAnnouncement[]; items?: SiteAnnouncement[] }
      setItems(Array.isArray(data.data) ? data.data : Array.isArray(data.items) ? data.items : [])
    } catch {
      // optional UI: fail silently
    } finally {
      setLoaded(true)
    }
  }, [])

  React.useEffect(() => {
    const initialId = window.setTimeout(() => void load(), 0)
    const intervalId = window.setInterval(() => void load(), 5 * 60 * 1000)

    return () => {
      window.clearTimeout(initialId)
      window.clearInterval(intervalId)
    }
  }, [load])

  if (!loaded) return null
  if (items.length === 0) return null

  return (
    <section className={cn("pt-4", className)} aria-label="Site announcements">
      <Card className="rounded-2xl border bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-4 w-4" />
            Announcements
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3 pt-0 pb-4 -mt-2">
          {items.map((a) => {
            const meta = levelBadge(a.level)

            return (
              <div key={a.id} className="rounded-xl border bg-background/50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium">{a.title}</div>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
                  </div>

                  {a.href ? (
                    <Button size="sm" variant="secondary" asChild className="shrink-0">
                      <a href={a.href} target="_blank" rel="noreferrer noopener">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {a.hrefLabel || "Open"}
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </section>
  )
}
