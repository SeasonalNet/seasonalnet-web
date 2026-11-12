"use client"

import { ModeToggle } from "@seasonalnet/shell/src/components/mode-toggle"
import { ShellHeader } from "@seasonalnet/shell/src/components/site-header"
import { site } from "@/lib/site"

export function SiteHeader() {
  return (
    <ShellHeader
      site={{
        name: site.name,
        subtitle: site.subtitle,
        portals: site.navigation,
      }}
      rightSlot={<ModeToggle />}
    />
  )
}
