"use client"


import { BrandMark } from "@/components/brand-mark"
import { site } from "@/lib/site"
import { ModeToggle } from "@/components/mode-toggle"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"

const navLinkClass =
  "inline-flex flex-row items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium " +
  "text-muted-foreground transition-colors " +
  "hover:bg-accent hover:text-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "data-[active]:bg-accent/60 data-[active]:text-foreground"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex min-h-[3.75rem] max-w-6xl items-start gap-3 px-4 py-2 md:items-center">
        <div className="flex items-center gap-2">
          <BrandMark className="h-7 w-24 sm:h-8 sm:w-32" />
          <div className="leading-tight">
            <div className="text-sm font-semibold">{site.name}</div>
<div className="text-xs text-muted-foreground">{site.subtitle}</div>
          </div>
        </div>

        {/* Desktop portals (Radix NavigationMenu, stable anchors, forced row layout) */}
        <div className="ml-3 min-w-0 flex-1 overflow-hidden">
          <div className="flex-1 min-w-0 flex items-center justify-center sm:justify-start overflow-x-auto overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch]">
          <NavigationMenu className="w-max justify-start">
            <NavigationMenuList className="flex w-max min-w-max !flex-none !justify-start w-max min-w-max !flex-none !justify-start w-full min-w-0 flex-nowrap md:flex-wrap items-center justify-start gap-1 overflow-x-auto md:overflow-visible overscroll-x-contain touch-pan-x">
              {site.portals.map((p) => (
                <NavigationMenuItem key={p.href} className="shrink-0">
                  <NavigationMenuLink
                    href={p.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={navLinkClass}
                    data-portal={p.key}
                  >
                    <p.icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                    <span className="leading-none whitespace-nowrap">
                      {p.title}
                    </span>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>

          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
