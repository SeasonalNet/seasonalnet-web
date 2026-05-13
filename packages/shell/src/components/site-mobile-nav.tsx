"use client"

import { Menu } from "lucide-react"
import { useState, type ReactNode } from "react"

import { Button } from "./ui/button"
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet"

type ShellMobileNavProps = {
  siteName: string
  siteSubtitle: string
  children: ReactNode
}

export function ShellMobileNav({ siteName, siteSubtitle, children }: ShellMobileNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full md:hidden" aria-label="Open site navigation">
          <Menu className="h-5 w-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="max-w-[22rem]">
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
          <SheetDescription>
            {siteName} · {siteSubtitle}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="overflow-y-auto px-4 py-4">
          <nav className="flex flex-col gap-2" aria-label="Site navigation" onClick={() => setOpen(false)}>
            {children}
          </nav>
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}
