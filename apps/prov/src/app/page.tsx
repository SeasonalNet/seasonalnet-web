import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { SiteFooter } from "@/components/site-footer"

const examples = [
  { label: "Wallpapers directory", value: "/wallpapers/" },
  { label: "Token provisioning", value: "/p/<token>/<file>" },
]

export default function Page() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-10">
      <section className="pt-10">
        <div className="rounded-3xl border bg-card/50 p-6 md:p-10">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">assets</Badge>
            <Badge variant="secondary">provisioning</Badge>
            <Badge variant="secondary">self-hosted</Badge>
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Provisioning</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Wallpapers, phone assets, and tokenized provisioning endpoints live here. The UI is just a friendly map; the
            endpoints are the real magic.
          </p>

          <Separator className="my-6" />

          <div className="grid gap-4 md:grid-cols-2">
            {examples.map((x) => (
              <Card key={x.label} className="bg-card/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{x.label}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <code className="text-foreground">{x.value}</code>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 text-xs text-muted-foreground">
            Note: CME lab HTTP exceptions and token rate-limits are handled at NGINX (as they should be).
          </div>
        </div>
      </section>
        <div className="mt-10">
      <SiteFooter />
    </div>

</main>
  )
}
