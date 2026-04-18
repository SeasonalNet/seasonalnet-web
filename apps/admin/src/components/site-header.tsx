import { AccountMenuClient } from "@seasonalnet/shell/src/components/account/account-menu-client"
import { ShellHeader } from "@seasonalnet/shell/src/components/site-header"

import {
  auth,
  isAuthorizedSession,
  sessionAccessTierLabel,
  sessionDisplayName,
  sessionInitials,
} from "@/auth"
import { ModeToggle } from "@/components/mode-toggle"
import { site } from "@/lib/site"

export async function SiteHeader() {
  const session = await auth()

  return (
    <ShellHeader
      site={site}
      rightSlot={
        <>
          <AccountMenuClient
            appLabel="SeasonalNet Admin"
            displayName={sessionDisplayName(session)}
            email={session?.user?.email || ""}
            initials={sessionInitials(session)}
            isAuthenticated={isAuthorizedSession(session)}
            accessTierLabel={sessionAccessTierLabel(session)}
            loginHref="/login"
          />
          <ModeToggle />
        </>
      }
    />
  )
}
