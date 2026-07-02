import { BlurFade } from "@/components/magic/blur-fade"
import { SiteFooter } from "@/components/site-footer"
import { site } from "@/lib/site"

import { Card, CardDescription, CardHeader, CardTitle } from "@seasonalnet/shell/src/components/ui/card"

function PortalCard({ portal }: { portal: (typeof site.portals)[number] }) {
  const Icon = portal.icon
  const ExternalLink = site.iconExternal

  return (
    <a
      href={portal.href}
      target="_blank"
      rel="noreferrer noopener"
      className="group block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="rounded-2xl bg-card/60 py-0 transition-all duration-200 hover:-translate-y-0.5 hover:bg-card/80 hover:shadow-sm">
        <CardHeader className="flex flex-row items-center gap-4 p-5 md:gap-5 md:p-6">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-background text-muted-foreground transition-colors group-hover:text-foreground">
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>

          <div className="min-w-0 space-y-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight md:text-xl">
              <span>{portal.title}</span>
              <ExternalLink
                className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </CardTitle>
            <CardDescription className="text-[15px] leading-6 md:text-base">
              {portal.description}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    </a>
  )
}

export default function Page() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-10">
      <section className="pt-10">
        <BlurFade>
          <div className="rounded-3xl border bg-card/50 px-6 py-10 text-center shadow-sm md:px-12 md:py-14">
            <div className="mx-auto max-w-3xl space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">{site.name}</h1>
              <p className="mx-auto max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                {site.description}
              </p>
            </div>
          </div>
        </BlurFade>
      </section>

      <section className="mt-10">
        <BlurFade delay={0.05}>
          <div className="mx-auto max-w-3xl space-y-3 text-center">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">About the platform.</h2>
            <p className="text-sm leading-6 text-muted-foreground md:text-base">
              {site.about}
            </p>
          </div>
        </BlurFade>
      </section>

      <section className="mt-12 space-y-6">
        <BlurFade delay={0.1}>
          <div className="mx-auto max-w-3xl space-y-3 text-center">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">What&apos;s on the platform?</h2>
            <p className="text-sm leading-6 text-muted-foreground md:text-base">
              Many things. See below.
            </p>
          </div>
        </BlurFade>

        <div className="flex w-full flex-col gap-4">
          {site.portals.map((portal, index) => (
            <BlurFade key={portal.key} delay={0.12 + index * 0.03}>
              <PortalCard portal={portal} />
            </BlurFade>
          ))}
        </div>
      </section>

      <div className="mt-12">
        <BlurFade delay={0.28}>
          <SiteFooter />
        </BlurFade>
      </div>
    </main>
  )
}
