import type { Metadata } from "next"
import type { ReactNode } from "react"
import "./globals.css"

import { ThemeProvider } from "@seasonalnet/shell/src/components/theme-provider"
import { Toaster } from "@seasonalnet/shell/src/components/ui/sonner"
import { SiteHeader } from "@/components/site-header"

export const metadata: Metadata = {
  title: "SeasonalNet Agent",
  description: "Seasonal Agent operator chat over the local runtime API.",
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="h-dvh overflow-hidden bg-background text-foreground antialiased transition-colors duration-300">
        <ThemeProvider>
          <div className="flex h-dvh flex-col overflow-hidden">
            <SiteHeader />
            {children}
            <Toaster position="top-right" richColors />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
