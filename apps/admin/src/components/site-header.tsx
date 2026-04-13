"use client"

import { ShellHeader } from "@seasonalnet/shell/src/components/site-header"
import { site } from "@/lib/site"
import { ModeToggle } from "@/components/mode-toggle"
import { AdminUserMenu } from "@/components/admin/admin-user-menu"

export function SiteHeader() {
  return (
    <ShellHeader
      site={site}
      rightSlot={
        <>
          <AdminUserMenu />
          <ModeToggle />
        </>
      }
    />
  )
}
