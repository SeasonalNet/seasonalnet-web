import { AccountMenuClient } from "@seasonalnet/shell/src/components/account/account-menu-client"

import {
  auth,
  isAuthorizedSession,
  sessionAccessTierLabel,
  sessionDisplayName,
  sessionInitials,
} from "@/auth"

export async function AdminUserMenu() {
  const session = await auth()

  return (
    <AccountMenuClient
      appLabel="SeasonalNet Admin"
      displayName={sessionDisplayName(session)}
      email={session?.user?.email || ""}
      initials={sessionInitials(session)}
      isAuthenticated={isAuthorizedSession(session)}
      accessTierLabel={sessionAccessTierLabel(session)}
      loginHref="/login"
    />
  )
}
