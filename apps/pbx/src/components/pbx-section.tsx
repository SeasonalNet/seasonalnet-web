import { cn } from "@seasonalnet/shell/src/lib/utils"

export function SectionHeader({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  className?: string
}) {
  return (
    <div className={cn("mx-auto max-w-3xl space-y-2 text-center", className)}>
      {eyebrow ? (
        <div className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
          {eyebrow}
        </div>
      ) : null}

      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
        {description ? <p className="text-sm leading-6 text-muted-foreground md:text-base">{description}</p> : null}
      </div>
    </div>
  )
}
