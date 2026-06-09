import { SiteFooter } from "@/components/site-footer"
import { PBXDashboard } from "@/components/pbx-dashboard"
import { BlurFade } from "@/components/magic/blur-fade"

export const dynamic = "force-dynamic"

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-10">
      <section className="space-y-6 pt-10">
        <BlurFade>
          <div className="rounded-3xl border bg-card/50 px-6 py-10 text-center shadow-sm md:px-12 md:py-14">
            <div className="mx-auto max-w-3xl space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">SeasonalPBX Dashboard</h1>
              <p className="mx-auto max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                Review your extension, update its profile, and use credential tools when the extension class supports self-service custody.
              </p>
            </div>
          </div>
        </BlurFade>

        <PBXDashboard />
      </section>

      <div className="mt-10">
        <SiteFooter />
      </div>
    </main>
  )
}
