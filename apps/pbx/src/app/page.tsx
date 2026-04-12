import { Card, CardContent, CardHeader, CardTitle } from "@seasonalnet/shell/src/components/ui/card"
import { Button } from "@seasonalnet/shell/src/components/ui/button"
import { Badge } from "@seasonalnet/shell/src/components/ui/badge"
import { SiteFooter } from "@/components/site-footer"
import { PBXMetricsPanel } from "@/components/pbx-metrics"
import { JoinPBXCard, PBXFeaturesGrid } from "@/components/pbx-join-and-features"
import { Phone, Activity, GitBranch, Shield, ArrowUpRight } from "lucide-react"

const links = [
  {
    title: "Service status",
    desc: "Uptime, endpoints, and external health checks.",
    href: "https://status.seasonalnet.org",
    icon: Activity,
  },
  {
    title: "Docs / repos",
    desc: "Configs, notes, and the dev nerve center.",
    href: "https://git.seasonalnet.org",
    icon: GitBranch,
  },
  {
    title: "Provisioning",
    desc: "Phone assets + token provisioning portal.",
    href: "https://prov.seasonalnet.org",
    icon: Shield,
  },
]

export default function Page() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-10">
      {/* Hero */}
      <section className="pt-10">
        <div className="rounded-3xl border bg-card/50 p-6 md:p-10">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">telecom</Badge>
            <Badge variant="secondary">pbx</Badge>
            <Badge variant="secondary">self-hosted</Badge>
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            SeasonalPBX
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            The front door for VoIP stuff: trunks, endpoints, lab interconnect, and the “don’t accidentally expose admin”
            safety dance.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <a href="https://status.seasonalnet.org" target="_blank" rel="noreferrer noopener">
                <Activity className="mr-2 h-4 w-4" />
                System Status
              </a>
            </Button>

            <Button variant="secondary" asChild>
              <a href="https://git.seasonalnet.org" target="_blank" rel="noreferrer noopener">
                <GitBranch className="mr-2 h-4 w-4" />
                Open Git
              </a>
            </Button>

            <Button variant="outline" asChild>
              <a href="https://www.seasonalnet.org" target="_blank" rel="noreferrer noopener">
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Back to Home
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Quick jump */}
      <section className="mt-8">
        <div className="text-sm text-muted-foreground">Quick jump</div>

        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {links.map((x) => (
            <Card key={x.title} className="bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <x.icon className="h-4 w-4" />
                  {x.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">{x.desc}</div>

                <Button size="sm" variant="secondary" asChild>
                  <a href={x.href} target="_blank" rel="noreferrer noopener">
                    <Phone className="mr-2 h-4 w-4" />
                    Open
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Metrics */}
      <section className="mt-10">
        <PBXMetricsPanel />
      </section>

      {/* Join (no duplicate card next to it) */}
      <section className="mt-10">
        <JoinPBXCard />
      </section>

      {/* Features */}
      <section className="mt-10">
        <PBXFeaturesGrid />
      </section>

      <div className="mt-10">
        <SiteFooter />
      </div>
    </main>
  )
}
