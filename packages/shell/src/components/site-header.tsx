
import { BrandMark } from "./brand-mark"
import { ShellMobileNav } from "./site-mobile-nav"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "./ui/navigation-menu"
import type { ComponentType, ReactNode } from "react"

type HeaderPortal = {
  readonly key: string
  readonly title: string
  readonly href: string
  readonly icon: ComponentType<{ className?: string }>
}

type HeaderSite = {
  readonly name: string
  readonly subtitle: string
  readonly portals: ReadonlyArray<HeaderPortal>
}

type ShellHeaderProps = {
  site: HeaderSite
  rightSlot?: ReactNode
}

const mobileNavLinkClass =
  "flex flex-row items-center gap-3 rounded-xl border bg-background px-3 py-3 text-sm font-medium " +
  "text-foreground transition-colors " +
  "hover:bg-accent hover:text-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

const navLinkClass =
  "inline-flex flex-row items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium " +
  "text-muted-foreground transition-colors " +
  "hover:bg-accent hover:text-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "data-[active]:bg-accent/60 data-[active]:text-foreground whitespace-nowrap"

export function ShellHeader({ site, rightSlot }: ShellHeaderProps) {
  const desktopLinks = site.portals.map((p) => {
    const Icon = p.icon

    return (
      <NavigationMenuItem key={p.key} className="shrink-0">
        <NavigationMenuLink
          href={p.href}
          target="_blank"
          rel="noreferrer noopener"
          className={navLinkClass}
          data-portal={p.key}
        >
          <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          <span className="leading-none whitespace-nowrap">{p.title}</span>
        </NavigationMenuLink>
      </NavigationMenuItem>
    )
  })

  const mobileLinks = site.portals.map((p) => {
    const Icon = p.icon

    return (
      <a
        key={p.key}
        href={p.href}
        target="_blank"
        rel="noreferrer noopener"
        className={mobileNavLinkClass}
        data-portal={p.key}
      >
        <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
        <span className="min-w-0 truncate">{p.title}</span>
      </a>
    )
  })

  return (
    <header className="sticky top-0 z-50 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex min-h-[3.75rem] max-w-6xl items-center gap-2 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <BrandMark className="h-7 w-24 shrink-0 sm:h-8 sm:w-32" />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold">{site.name}</div>
            <div className="truncate text-xs text-muted-foreground">{site.subtitle}</div>
          </div>
        </div>

        <div className="ml-3 hidden min-w-0 flex-1 items-center justify-center md:flex md:justify-start">
          <NavigationMenu className="w-full justify-start" viewport={false}>
            <NavigationMenuList className="flex min-w-0 flex-wrap items-center justify-start gap-1">
              {desktopLinks}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {rightSlot}
          <ShellMobileNav siteName={site.name} siteSubtitle={site.subtitle}>{mobileLinks}</ShellMobileNav>
        </div>
      </div>
    </header>
  )
}
