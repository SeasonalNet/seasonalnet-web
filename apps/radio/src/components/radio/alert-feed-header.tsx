import { Button } from "@seasonalnet/shell/src/components/ui/button"
import { cn } from "@seasonalnet/shell/src/lib/utils"
import { RefreshCw } from "lucide-react"

type Props = {
  id: string
  title: string
  description: string
  loading: boolean
  onRefresh: () => void
  divider?: boolean
}

export function AlertFeedHeader({ id, title, description, loading, onRefresh, divider = false }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3",
        divider && "border-t border-border/70 pt-8",
      )}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <h3 id={id} className="text-sm font-medium">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={loading}
        className="shrink-0 gap-2 self-start sm:self-auto"
      >
        <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
        Refresh
      </Button>
    </div>
  )
}
