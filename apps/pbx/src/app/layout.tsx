import type { Metadata } from "next"
import "./globals.css"

import { ThemeProvider } from "@seasonalnet/shell/src/components/theme-provider"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { ShellLayout } from "@seasonalnet/shell/src/components/shell-layout"
import { SiteAnnouncements } from "@seasonalnet/shell/src/components/site-announcements"
import { Toaster } from "@seasonalnet/shell/src/components/ui/sonner"

export const metadata: Metadata = {
  title: "SeasonalPBX",
  description: "SeasonalPBX landing page and authenticated extension self-service dashboard.",
  icons: {
    icon: [
      { url: "/favicon-light.ico", media: "(prefers-color-scheme: light)" },
      { url: "/favicon-dark.ico", media: "(prefers-color-scheme: dark)" },
      { url: "/favicon.ico" },
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
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
          <Toaster richColors closeButton position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
