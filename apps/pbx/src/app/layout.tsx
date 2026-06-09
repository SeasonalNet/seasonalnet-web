import type { Metadata } from "next"
import "./globals.css"

import { ThemeProvider } from "@seasonalnet/shell/src/components/theme-provider"
import { SiteHeader } from "@/components/site-header"
import { SiteAnnouncements } from "@seasonalnet/shell/src/components/site-announcements"
import { Toaster } from "@seasonalnet/shell/src/components/ui/sonner"

export const metadata: Metadata = {
  title: "SeasonalNet",
  description: "Unified front doors for SeasonalNet services.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased transition-colors duration-300">
        <ThemeProvider>
          <SiteHeader />

          <div className="mx-auto max-w-6xl px-4">
            <SiteAnnouncements />
          </div>
          {children}
          <Toaster richColors closeButton position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
