"use client"

import Link from "next/link"
import { ChevronDown, LogIn, Mail, ShieldCheck, UserRound } from "lucide-react"

import { Avatar, AvatarFallback } from "../ui/avatar"
import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"

type AccountMenuClientProps = {
  displayName: string
  email?: string
  initials: string
  isAuthenticated: boolean
  appLabel: string
  authProviderLabel?: string
  accessTierLabel?: string | null
  loginHref?: string
}

export function AccountMenuClient({
  displayName,
  email,
  initials,
  isAuthenticated,
  appLabel,
  authProviderLabel = "Authenticated via authentik",
  accessTierLabel,
  loginHref = "/login",
}: AccountMenuClientProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open account menu"
          className="h-10 w-10 rounded-full"
        >
          <Avatar className="h-8 w-8 border">
            <AvatarFallback className="text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 rounded-2xl p-2">
        <div className="rounded-xl border bg-card/40 p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border">
              <AvatarFallback className="text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{displayName}</div>
              {email ? (
                <div className="truncate text-xs text-muted-foreground">
                  {email}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-3 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <UserRound className="h-3.5 w-3.5" />
              <span>
                {isAuthenticated ? `Signed in to ${appLabel}` : `Not signed in to ${appLabel}`}
              </span>
            </div>

            {email ? (
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                <span className="truncate">{email}</span>
              </div>
            ) : null}

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>
                  {accessTierLabel ? `${authProviderLabel} · ${accessTierLabel}` : authProviderLabel}
                </span>
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
            {isAuthenticated ? (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                <span>Account status</span>
              </>
            ) : (
              <Button asChild variant="outline" size="sm" className="rounded-lg">
                <Link href={loginHref}>
                  <LogIn className="h-3.5 w-3.5" />
                  Sign in
                </Link>
              </Button>
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
