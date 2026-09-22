import { Badge } from "@seasonalnet/shell/src/components/ui/badge"
import { Button } from "@seasonalnet/shell/src/components/ui/button"
import { Separator } from "@seasonalnet/shell/src/components/ui/separator"
import { cn } from "@seasonalnet/shell/src/lib/utils"
import { ExternalLink } from "lucide-react"
import { AlertEventIcon, type AlertToneMode } from "@/components/radio/alert-event-icon"

type RadioAlertCardProps = {
  event: string
  headline: string
  severity: string
  area: string
  until: string | null
  href: string | null
  hrefLabel: string
  sourceLabel?: string
  toneClass: string
  toneMode?: AlertToneMode
}

function severityBookmarkClass(severity: string) {
  switch (severity) {
    case "Extreme":
      return "border-red-700 bg-red-50/30 text-red-800 dark:border-red-400 dark:bg-red-950/20 dark:text-red-300"
    case "Severe":
      return "border-orange-600 bg-orange-50/25 text-orange-800 dark:border-orange-400 dark:bg-orange-950/20 dark:text-orange-300"
    case "Moderate":
      return "border-amber-500 bg-amber-50/25 text-amber-800 dark:border-amber-300 dark:bg-amber-950/20 dark:text-amber-200"
    case "Minor":
      return "border-sky-600 bg-sky-50/20 text-sky-800 dark:border-sky-400 dark:bg-sky-950/20 dark:text-sky-300"
    default:
      return "border-border bg-muted/20 text-muted-foreground"
  }
}

export function RadioAlertCard({
  event,
  headline,
  severity,
  area,
  until,
  href,
  hrefLabel,
  sourceLabel,
  toneClass,
  toneMode = "nws",
}: RadioAlertCardProps) {
  return (
    <article
      data-severity={severity}
      className="grid min-h-32 w-full max-w-full grid-cols-[clamp(6rem,22%,10rem)_minmax(0,1fr)] overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] duration-150 hover:border-foreground/30 hover:shadow-md focus-within:ring-2 focus-within:ring-ring/40 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1"
    >
      <div
        className={cn(
          "m-2 flex min-h-[7rem] flex-col justify-between rounded-lg border-2 p-3 sm:p-4",
          severityBookmarkClass(severity),
        )}
      >
        <span className="break-words text-[0.65rem] font-bold uppercase tracking-[0.16em]">
          {severity || "Unknown"}
        </span>
        <AlertEventIcon event={event} severity={severity} mode={toneMode} className="size-7" />
      </div>

      <div className="relative flex min-w-0 flex-col p-4 sm:p-5">
        {href ? (
          <Button variant="ghost" size="sm" className="absolute right-3 top-3 shrink-0 gap-2" asChild>
            <a href={href} target="_blank" rel="noreferrer noopener" aria-label={`${hrefLabel} for ${event}`}>
              <ExternalLink className="size-4" />
              <span className="hidden sm:inline">{hrefLabel}</span>
            </a>
          </Button>
        ) : null}

        <div className={cn("flex min-w-0 flex-wrap items-center gap-2", href && "pr-20")}>
          <h4 className={cn("min-w-0 max-w-full line-clamp-2 text-base font-semibold leading-tight", toneClass)}>{event}</h4>
          {sourceLabel ? (
            <Badge variant="outline" className="max-w-[12rem] shrink-0 text-xs">
              <span className="truncate">{sourceLabel}</span>
            </Badge>
          ) : null}
        </div>

        {headline ? <p className="mt-3 max-w-full break-words text-sm text-muted-foreground [text-wrap:pretty]">{headline}</p> : null}

        <dl className="mt-auto grid w-full gap-y-1 pt-4 text-sm sm:flex sm:items-start sm:gap-4">
          <div className="flex min-w-0 items-start gap-1.5 sm:max-w-[48%] sm:shrink">
            <dt className="shrink-0 font-medium">For:</dt>
            <dd className="min-w-0 break-words text-muted-foreground">{area || "—"}</dd>
          </div>
          <Separator orientation="vertical" className="hidden h-5 w-px shrink-0 self-center bg-border/50 sm:block" />
          <div className="flex min-w-0 items-start gap-1.5 sm:flex-1">
            <dt className="shrink-0 font-medium">Until:</dt>
            <dd className="min-w-0 break-words text-muted-foreground">{until ?? "—"}</dd>
          </div>
        </dl>
      </div>
    </article>
  )
}
