import type { Metadata } from 'next';
import './globals.css';

import { RootProvider } from 'fumadocs-ui/provider/next';

import { SiteAnnouncements } from '@seasonalnet/shell/src/components/site-announcements';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  title: 'SeasonalNet Docs',
  description: 'Public documentation frontend for SeasonalNet.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased transition-colors duration-300">
        <RootProvider search={{ enabled: false }}>
          <SiteHeader />
          <div className="mx-auto max-w-6xl px-4">
            <SiteAnnouncements />
          </div>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
