import { ShellFooter } from "@seasonalnet/shell/src/components/site-footer"
import { site } from "@/lib/site"

export function SiteFooter() {
  return (
    <ShellFooter
      site={{
        name: site.name,
        description: site.description,
        footerNote: site.footerNote,
        portals: site.navigation,
      }}
    />
  )
}
