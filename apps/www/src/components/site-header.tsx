"use client"

import { ShellHeader } from "@seasonalnet/shell/src/components/site-header"
import { site } from "@/lib/site"
import { ModeToggle } from "@/components/mode-toggle"

export function SiteHeader() {
  return <ShellHeader site={site} rightSlot={<ModeToggle />} />
}
