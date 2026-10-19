import type { Metadata } from "next"
import "./globals.css"
import "maplibre-gl/dist/maplibre-gl.css"

import { ThemeProvider } from "@seasonalnet/shell/src/components/theme-provider"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { ShellLayout } from "@seasonalnet/shell/src/components/shell-layout"
import { SiteAnnouncements } from "@seasonalnet/shell/src/components/site-announcements"

export const metadata: Metadata = {
  title: "SeasonalNet",
  description: "Unified front doors for SeasonalNet services.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased transition-colors duration-300">
        <ThemeProvider>
          <ShellLayout
            header={<SiteHeader />}
            announcements={<SiteAnnouncements />}
            footer={<SiteFooter />}
          >
            {children}
          </ShellLayout>
        </ThemeProvider>
      </body>
    </html>
  )
}
