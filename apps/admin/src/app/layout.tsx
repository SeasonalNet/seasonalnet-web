import type { Metadata } from "next"
import "./globals.css"

import { ThemeProvider } from "@/components/theme-provider"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { ShellLayout } from "@seasonalnet/shell/src/components/shell-layout"
import { SiteAnnouncements } from "@/components/site-announcements"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "SeasonalNet Admin",
  description: "Centralized control plane for SeasonalNet systems.",
}

export const dynamic = "force-dynamic"

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
          <Toaster richColors closeButton position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
