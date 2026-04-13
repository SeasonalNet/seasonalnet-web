"use client"

import { ShellHeader } from "@seasonalnet/shell/src/components/site-header"
import { ModeToggle } from "@/components/mode-toggle"
import { site } from "@/lib/site"

export function SiteHeader() {
  return <ShellHeader site={site} rightSlot={<ModeToggle />} />
}
