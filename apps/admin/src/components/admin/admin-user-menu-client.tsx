"use client"

import { ChevronDown, Mail, ShieldCheck, UserRound } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

type AdminUserMenuClientProps = {
  displayName: string
  email?: string
  initials: string
}

export function AdminUserMenuClient({
  displayName,
  email,
  initials,
}: AdminUserMenuClientProps) {
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
              <span>Signed in to SeasonalNet</span>
            </div>

            {email ? (
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                <span className="truncate">{email}</span>
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Authenticated via authentik</span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
            <ChevronDown className="h-3.5 w-3.5" />
            <span>Account menu</span>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
