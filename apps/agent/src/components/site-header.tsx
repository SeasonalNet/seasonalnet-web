import { AccountMenuClient } from "@seasonalnet/shell/src/components/account/account-menu-client"
import { ModeToggle } from "@seasonalnet/shell/src/components/mode-toggle"
import { ShellHeader } from "@seasonalnet/shell/src/components/site-header"

import {
  auth,
  isAuthorizedSession,
  sessionAccessTierLabel,
  sessionDisplayName,
  sessionInitials,
} from "@/auth"
import { site } from "@/lib/site"

export async function SiteHeader() {
  const session = await auth()

  return (
    <ShellHeader
      site={site}
      rightSlot={
        <>
          <AccountMenuClient
            appLabel="SeasonalNet Agent"
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
