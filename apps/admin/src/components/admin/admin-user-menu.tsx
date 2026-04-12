import { auth } from "@/auth"
import { AdminUserMenuClient } from "@/components/admin/admin-user-menu-client"

function initials(name?: string | null, email?: string | null) {
  const source = (name || email || "U").trim()
  const parts = source.split(/\s+/).filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }

  return source.slice(0, 2).toUpperCase()
}

export async function AdminUserMenu() {
  const session = await auth()
  const user = session?.user

  const displayName =
    user?.name || (session as any)?.preferred_username || "Signed in"
  const email = user?.email || ""

  return (
    <AdminUserMenuClient
      displayName={displayName}
      email={email}
      initials={initials(user?.name, user?.email)}
    />
  )
}
