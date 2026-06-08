"use client"

import { useEffect, useRef, useState } from "react"

type Props = {
  value: number | null | undefined
  durationMs?: number
  format?: (n: number) => string
}

export function AnimatedNumber({ value, durationMs = 650, format }: Props) {
  const [shown, setShown] = useState<number>(typeof value === "number" ? value : 0)
  const prevValueRef = useRef<number>(typeof value === "number" ? value : 0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof value !== "number" || Number.isNaN(value)) return

    const from = prevValueRef.current
    const to = value
    prevValueRef.current = to

    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    // If the jump is tiny, just snap (prevents micro-jitter on frequent refresh)
    if (Math.abs(to - from) < 1) {
      rafRef.current = requestAnimationFrame(() => setShown(to))
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
      }
    }

    const start = performance.now()

    // Easing: fast start, slow finish (cubic ease-out)
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = easeOutCubic(t)
      const current = from + (to - from) * eased
      setShown(current)

      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value, durationMs])

  if (typeof value !== "number") return <span>—</span>

  const n = Math.round(shown)
  const out = format ? format(n) : new Intl.NumberFormat().format(n)
  return <span>{out}</span>
}
