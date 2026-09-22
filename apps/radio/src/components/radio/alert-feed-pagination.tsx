import { Button } from "@seasonalnet/shell/src/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"

export const ALERT_PAGE_SIZE = 5

type Props = {
  total: number
  visibleCount: number
  onShowMore: () => void
  onShowLess: () => void
}

export function AlertFeedPagination({ total, visibleCount, onShowMore, onShowLess }: Props) {
  if (total <= ALERT_PAGE_SIZE) return null

  const remaining = Math.max(0, total - visibleCount)
  const shown = Math.min(visibleCount, total)

  return (
    <div className="flex min-h-8 flex-wrap items-center justify-center gap-2 pt-1">
      {remaining > 0 ? (
        <Button type="button" variant="outline" size="sm" onClick={onShowMore} aria-live="polite">
          <ChevronDown className="size-4" />
          Show {Math.min(ALERT_PAGE_SIZE, remaining)} more
          <span aria-hidden="true" className="text-muted-foreground/70">
            •
          </span>
          <span className="text-xs text-muted-foreground">Showing {shown} of {total}</span>
        </Button>
      ) : null}

      {visibleCount > ALERT_PAGE_SIZE ? (
        <Button type="button" variant="outline" size="sm" onClick={onShowLess} aria-live="polite">
          <ChevronUp className="size-4" />
          Show less
          <span aria-hidden="true" className="text-muted-foreground/70">
            •
          </span>
          <span className="text-xs text-muted-foreground">Showing {shown} of {total}</span>
        </Button>
      ) : null}
    </div>
  )
}
