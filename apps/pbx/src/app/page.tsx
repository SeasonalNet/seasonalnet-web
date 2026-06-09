import { Button } from "@seasonalnet/shell/src/components/ui/button"
import { SiteFooter } from "@/components/site-footer"
import { PBXMetricsPanel } from "@/components/pbx-metrics"
import { PBXFeaturesGrid } from "@/components/pbx-join-and-features"
import { BlurFade } from "@/components/magic/blur-fade"
import { LayoutDashboard, MessagesSquare } from "lucide-react"

export default function Page() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-10">
      <section className="pt-10">
        <BlurFade>
          <div className="rounded-3xl border bg-card/50 px-6 py-10 text-center shadow-sm md:px-12 md:py-14">
            <div className="mx-auto max-w-3xl space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">SeasonalPBX</h1>

              <p className="mx-auto max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                A free, hobbyist PBX system for telephony enthusiasts and nerds alike.
              </p>

              <div className="flex flex-col items-center justify-center gap-3 pt-3 sm:flex-row">
                <Button asChild size="lg" className="min-w-40 transition-all hover:-translate-y-0.5 active:translate-y-0">
                  <a href="https://discord.gg/UDfrTwYTy2" target="_blank" rel="noreferrer noopener">
                    <MessagesSquare className="mr-2 h-4 w-4" />
                    Join Discord
                  </a>
                </Button>

                <Button asChild size="lg" variant="secondary" className="min-w-40 transition-all hover:-translate-y-0.5 active:translate-y-0">
                  <a href="/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </BlurFade>
      </section>

      <section className="mt-10">
        <PBXFeaturesGrid />
      </section>

      <section className="mt-12">
        <PBXMetricsPanel />
      </section>

      <div className="mt-12">
        <SiteFooter />
      </div>
    </main>
  )
}
