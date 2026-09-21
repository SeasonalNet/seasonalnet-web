import { Separator } from "./ui/separator"

type FooterPortal = {
  readonly key: string
  readonly title: string
  readonly href: string
}

type FooterSite = {
  readonly name: string
  readonly description: string
  readonly footerNote: string
  readonly portals: ReadonlyArray<FooterPortal>
}

type ShellFooterProps = {
  site: FooterSite
}

const policyLinks: ReadonlyArray<FooterPortal> = [
  {
    key: "privacy",
    title: "Privacy",
    href: "https://docs.seasonalnet.org/docs/policies/privacy",
  },
  {
    key: "terms",
    title: "Terms",
    href: "https://docs.seasonalnet.org/docs/policies/terms",
  },
  {
    key: "acceptable-use",
    title: "Acceptable Use",
    href: "https://docs.seasonalnet.org/docs/policies/acceptable-use",
  },
]

export function ShellFooter({ site }: ShellFooterProps) {
  return (
    <footer className="mt-12 border-y bg-card/40">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.35fr_repeat(3,minmax(0,1fr))]">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="text-sm font-semibold">{site.name}</div>
            <div className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{site.description}</div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Links</div>
            <Separator className="my-3" />
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {site.portals.map((p) => (
                <a
                  key={p.key}
                  className="transition-colors hover:text-foreground"
                  href={p.href}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  {p.title}
                </a>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Policies</div>
            <Separator className="my-3" />
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {policyLinks.map((policy) => (
                <a
                  key={policy.key}
                  className="transition-colors hover:text-foreground"
                  href={policy.href}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  {policy.title}
                </a>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Notes</div>
            <Separator className="my-3" />
            <div className="text-sm leading-6 text-muted-foreground">{site.footerNote}</div>
          </div>
        </div>

        <Separator className="my-6" />
        <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} {site.name}</span>
          <span>SeasonalNet web services</span>
        </div>
      </div>
    </footer>
  )
}
