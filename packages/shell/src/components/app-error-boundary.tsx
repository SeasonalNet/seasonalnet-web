"use client"

import { useEffect } from "react"

type AppErrorBoundaryProps = {
  error: Error & { digest?: string }
  unstable_retry: () => void
}

export function AppErrorBoundary({ error, unstable_retry }: AppErrorBoundaryProps) {
  useEffect(() => {
    console.error("Application route failed", error)
  }, [error])

  return (
    <main className="mx-auto grid min-h-[60vh] max-w-2xl place-items-center px-6 py-16 text-center">
      <div className="space-y-5 rounded-2xl border bg-card p-8 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Temporary error</p>
        <h1 className="text-2xl font-semibold tracking-tight">This view could not be loaded</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          The rest of the site is still available. Retry the failed request, or navigate to another page.
        </p>
        <button
          type="button"
          onClick={unstable_retry}
          className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Try again
        </button>
        {error.digest ? <p className="text-xs text-muted-foreground">Reference: {error.digest}</p> : null}
      </div>
    </main>
  )
}

export function GlobalErrorBoundary(props: AppErrorBoundaryProps) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#050505", color: "#fafafa", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, boxSizing: "border-box" }}>
          <div style={{ maxWidth: 560, border: "1px solid #333", borderRadius: 16, padding: 32, textAlign: "center" }}>
            <p style={{ margin: "0 0 8px", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#aaa" }}>
              Temporary error
            </p>
            <h1 style={{ margin: "0 0 12px", fontSize: 26 }}>SeasonalNet could not render this page</h1>
            <p style={{ margin: "0 0 20px", lineHeight: 1.6, color: "#bbb" }}>
              Retry the page. If the problem continues, the service may still be recovering.
            </p>
            <button
              type="button"
              onClick={props.unstable_retry}
              style={{ border: "1px solid #555", borderRadius: 8, background: "#111", color: "#fff", padding: "10px 16px", cursor: "pointer" }}
            >
              Try again
            </button>
            {props.error.digest ? <p style={{ margin: "16px 0 0", fontSize: 12, color: "#888" }}>Reference: {props.error.digest}</p> : null}
          </div>
        </main>
      </body>
    </html>
  )
}
