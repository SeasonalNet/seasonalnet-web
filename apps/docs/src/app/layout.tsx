import type { Metadata } from 'next';
import './globals.css';

import { RootProvider } from 'fumadocs-ui/provider/next';

import { ThemeProvider } from '@seasonalnet/shell/src/components/theme-provider';

import { DocsAppShell } from '@/components/docs-app-shell';

export const metadata: Metadata = {
  title: {
    default: 'SeasonalNet',
    template: '%s | SeasonalNet',
  },
  description: 'Public documentation frontend for SeasonalNet.',
  icons: {
    icon: [
      { url: '/favicon-light.ico', media: '(prefers-color-scheme: light)' },
      { url: '/favicon-dark.ico', media: '(prefers-color-scheme: dark)' },
      { url: '/favicon.ico' },
      { url: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased transition-colors duration-300">
        <ThemeProvider>
          <RootProvider search={{ enabled: false }} theme={{ enabled: false }}>
            <DocsAppShell>{children}</DocsAppShell>
          </RootProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
