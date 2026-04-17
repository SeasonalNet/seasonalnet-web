import { ShellFooter } from "@seasonalnet/shell/src/components/site-footer"

import { site } from "@/lib/site"

export function SiteFooter() {
  return (
    <div className="shrink-0">
      <ShellFooter site={site} />
    </div>
  )
}
