"use client"

import * as React from "react"
import { Separator } from "@seasonalnet/shell/src/components/ui/separator"
import { cn } from "@seasonalnet/shell/src/lib/utils"

const ALERT_CARD_TRANSITION_MS = 180

type AlertFeedItem = { id: string }

type AlertFeedListProps<T extends AlertFeedItem> = {
  items: T[]
  renderItem: (item: T) => React.ReactNode
}

type PresenceEntry<T> = {
  item: T
  phase: "enter" | "present" | "exit"
}

export function AlertFeedList<T extends AlertFeedItem>({ items, renderItem }: AlertFeedListProps<T>) {
  const [entries, setEntries] = React.useState<PresenceEntry<T>[]>(() =>
    items.map((item) => ({ item, phase: "present" })),
  )

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setEntries((previous) => {
        const previousById = new Map(previous.map((entry) => [entry.item.id, entry]))
        const incomingIds = new Set(items.map((item) => item.id))
        const nextEntries = items.map((item) => {
          const existing = previousById.get(item.id)
          return existing
            ? { item, phase: existing.phase === "exit" ? "enter" : existing.phase }
            : { item, phase: "enter" as const }
        })
        const exitingEntries = previous
          .filter((entry) => !incomingIds.has(entry.item.id))
          .map((entry) => ({ ...entry, phase: "exit" as const }))

        const next = [...nextEntries, ...exitingEntries]
        const unchanged =
          next.length === previous.length &&
          next.every(
            (entry, index) =>
              entry.item.id === previous[index]?.item.id &&
              entry.item === previous[index]?.item &&
              entry.phase === previous[index]?.phase,
          )

        return unchanged ? previous : next
      })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [items])

  React.useEffect(() => {
    const entering = entries.some((entry) => entry.phase === "enter")
    const exitingIds = new Set(entries.filter((entry) => entry.phase === "exit").map((entry) => entry.item.id))
    const frame = entering
      ? window.requestAnimationFrame(() => {
          setEntries((current) =>
            current.map((entry) => (entry.phase === "enter" ? { ...entry, phase: "present" } : entry)),
          )
        })
      : null
    const timer = exitingIds.size
      ? window.setTimeout(() => {
          setEntries((current) => current.filter((entry) => !exitingIds.has(entry.item.id)))
        }, ALERT_CARD_TRANSITION_MS)
      : null

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      if (timer !== null) window.clearTimeout(timer)
    }
  }, [entries])

  return (
    <div>
      {entries.map((entry, index) => (
        <div
          key={entry.item.id}
          className={cn(
            "motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-reduce:transition-none",
            entry.phase === "enter" && "opacity-0 translate-y-1",
            entry.phase === "exit" && "opacity-0 -translate-y-1",
            entry.phase === "present" && "opacity-100 translate-y-0",
          )}
        >
          {index > 0 ? <Separator className="my-3 bg-border/80" /> : null}
          {renderItem(entry.item)}
        </div>
      ))}
    </div>
  )
}
