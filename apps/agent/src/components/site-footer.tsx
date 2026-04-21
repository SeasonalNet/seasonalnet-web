import { ShellFooter } from "@seasonalnet/shell/src/components/site-footer"

import { site } from "@/lib/site"

export function SiteFooter() {
  return (
    <div className="hidden shrink-0 lg:block">
      <ShellFooter site={site} />
    </div>
  )
}
