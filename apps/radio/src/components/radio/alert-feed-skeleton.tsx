import { Skeleton } from "@seasonalnet/shell/src/components/ui/skeleton"

export function AlertFeedSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1].map((index) => (
        <div
          key={index}
          className="grid min-h-32 w-full max-w-full grid-cols-[clamp(6rem,22%,10rem)_minmax(0,1fr)] overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        >
          <Skeleton className="m-2 min-h-[7rem] rounded-lg border-2" />
          <div className="flex min-w-0 flex-col p-4 sm:p-5">
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-4/5" />
            <div className="mt-auto flex gap-4 pt-4">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
