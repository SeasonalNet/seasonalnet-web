import { site } from "@/lib/site"
import { BlurFade } from "@/components/magic/blur-fade"
import { SiteFooter } from "@/components/site-footer"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

function PortalCard({ p }: { p: (typeof site.portals)[number] }) {
  const Icon = p.icon
  const Ext = site.iconExternal

  return (
    <a
      href={p.href}
      rel="noreferrer"
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl"
    >
      <Card className="h-full rounded-2xl transition-colors hover:bg-accent/40">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-xl border bg-background p-2">
                <Icon className="h-4 w-4" />
              </div>
              <CardTitle className="text-base">{p.title}</CardTitle>
            </div>
            <Ext className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
          <CardDescription>{p.description}</CardDescription>
        </CardHeader>
      </Card>
    </a>
  )
}

export default function Page() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {/* subtle background, no weird GPU masks/blur tricks */}
        <div className="absolute left-1/2 top-[-240px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-foreground/5 blur-3xl" />
      </div>

      <BlurFade>
        <Card className="rounded-3xl">
          <CardContent className="p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-full">live services</Badge>
                  <Badge variant="outline" className="rounded-full">simple</Badge>
                  <Badge variant="outline" className="rounded-full">self-hosted</Badge>
                </div>

                <h1 className="text-4xl font-semibold tracking-tight">{site.name}</h1>
                <p className="mt-3 text-muted-foreground">{site.description}</p>

                <div className="mt-6 flex flex-wrap gap-3">
                  {site.primary.map((b) => {
                    const Icon = b.icon
                    return (
                      <Button asChild key={b.href} className="rounded-2xl">
                        <a href={b.href} rel="noreferrer">
                          <Icon className="mr-2 h-4 w-4" />
                          {b.title}
                        </a>
                      </Button>
                    )
                  })}
                  <Button asChild variant="secondary" className="rounded-2xl">
                    <a href="https://git.seasonalnet.org/" rel="noreferrer">Open Forgejo</a>
                  </Button>
                </div>
              </div>

              <div className="w-full md:max-w-sm">
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-base">Quick jump</CardTitle>
                    <CardDescription>Pick a subsystem. One click, no drama.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2">
                    {site.portals.slice(0, 4).map((p) => (
                      <Button asChild key={p.key} variant="outline" className="justify-start rounded-xl">
                        <a href={p.href} rel="noreferrer">
                          <p.icon className="mr-2 h-4 w-4" />
                          {p.title}
                        </a>
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </BlurFade>

      <BlurFade delay={0.05}>
        <div className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Portals</div>
              <h2 className="text-2xl font-semibold tracking-tight">Pick a subsystem</h2>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid gap-4 md:grid-cols-3">
            {site.portals.map((p) => (
              <PortalCard key={p.key} p={p} />
            ))}
          </div>
        </div>
      </BlurFade>

      <BlurFade delay={0.1}>
        <SiteFooter />
      </BlurFade>
    </main>
  )
}
