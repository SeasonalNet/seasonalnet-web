"use client"

import * as React from "react"
import { cn } from "@seasonalnet/shell/src/lib/utils"

type AlertFeedScrollProps = {
  children: React.ReactNode
  className?: string
}

export function AlertFeedScroll({ children, className }: AlertFeedScrollProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [showTopFade, setShowTopFade] = React.useState(false)
  const [showBottomFade, setShowBottomFade] = React.useState(false)

  const updateScrollEdges = React.useCallback(() => {
    const element = scrollRef.current
    if (!element) return

    setShowTopFade(element.scrollTop > 1)
    setShowBottomFade(element.scrollTop + element.clientHeight < element.scrollHeight - 1)
  }, [])

  React.useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    updateScrollEdges()
    element.addEventListener("scroll", updateScrollEdges, { passive: true })

    const resizeObserver = new ResizeObserver(updateScrollEdges)
    resizeObserver.observe(element)
    if (element.firstElementChild) resizeObserver.observe(element.firstElementChild)

    return () => {
      element.removeEventListener("scroll", updateScrollEdges)
      resizeObserver.disconnect()
    }
  }, [updateScrollEdges])

  return (
    <div className={cn("relative", className)}>
      <div
        ref={scrollRef}
        className="max-h-[min(50rem,70vh)] overflow-y-auto overscroll-contain pr-2"
      >
        {children}
      </div>

      {showTopFade ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-card via-card/70 to-transparent"
        />
      ) : null}
      {showBottomFade ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-card via-card/70 to-transparent"
        />
      ) : null}
    </div>
  )
}
