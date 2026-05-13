import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { SiteFooter } from "@/components/site-footer"
import { AdminWorkspace } from "@/components/admin/admin-workspace"
import { buildAdminModules } from "@/lib/admin/modules"
import { getSeasonalWeatherOverview } from "@/lib/server/modules/seasonalweather"
import { getSeasonalProvisioningOverview } from "@/lib/server/modules/seasonalprovisioning"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams?: Promise<{ module?: string }>
}

export default async function Page({ searchParams }: PageProps) {
  const [{ module: selectedModuleId } = {}, seasonalWeatherOverview, seasonalProvisioningOverview] =
    await Promise.all([
      searchParams,
      getSeasonalWeatherOverview(),
      getSeasonalProvisioningOverview(),
    ])

  const modules = buildAdminModules(
    seasonalWeatherOverview,
    seasonalProvisioningOverview,
  ).filter((module) => !module.tags.includes("planned"))

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10">
      <section className="space-y-6 pt-10">
        <div className="rounded-3xl border bg-card/50 p-6 md:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">admin</Badge>
                <Badge variant="secondary">control-plane</Badge>
                <Badge variant="secondary">self-hosted</Badge>
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                SeasonalNet Admin
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                Status, operations, and administration for SeasonalNet systems.
                Select a module from the sidebar and work in one focused panel.
              </p>
            </div>
          </div>

          <Separator className="my-6" />

          <p className="text-sm text-muted-foreground md:text-base">
            Current modules: <span className="text-foreground/90">{modules.length}</span>
          </p>
        </div>

        <AdminWorkspace modules={modules} selectedModuleId={selectedModuleId} />
      </section>

      <div className="mt-10">
        <SiteFooter />
      </div>
    </main>
  )
}
