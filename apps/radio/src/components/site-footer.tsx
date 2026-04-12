import { site } from "@/lib/site"
import { Separator } from "@/components/ui/separator"

export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-6xl px-4 pb-10">
      <div className="mt-12 rounded-2xl border bg-card">
        <div className="grid gap-6 p-6 md:grid-cols-3">
          <div>
            <div className="text-sm font-semibold">{site.name}</div>
            <div className="mt-2 text-sm text-muted-foreground">{site.description}</div>
          </div>

          <div>
            <div className="text-sm font-semibold">Links</div>
            <Separator className="my-3" />
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {site.portals.map((p) => (
                <a
                  key={p.key}
                  className="hover:text-foreground transition-colors"
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
            <div className="text-sm font-semibold">Notes</div>
            <Separator className="my-3" />
            <div className="text-sm text-muted-foreground">{site.footerNote}</div>
            <div className="mt-2 text-xs text-muted-foreground/80">
              © {new Date().getFullYear()} {site.name}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
