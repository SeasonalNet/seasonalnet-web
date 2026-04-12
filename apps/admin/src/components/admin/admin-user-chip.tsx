import { auth } from "@/auth"

function initials(name?: string | null, email?: string | null) {
  const source = (name || email || "U").trim()
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

export async function AdminUserChip() {
  const session = await auth()
  const user = session?.user

  if (!user) return null

  const displayName = user.name || (session as any).preferred_username || "Signed in"
  const email = user.email || ""

  return (
    <div className="rounded-2xl border bg-card/40 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-background text-sm font-semibold">
          {initials(user.name, user.email)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{displayName}</div>
          {email ? (
            <div className="truncate text-xs text-muted-foreground">{email}</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
