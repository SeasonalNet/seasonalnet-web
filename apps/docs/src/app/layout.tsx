import type { Metadata } from 'next';
import './globals.css';

import { RootProvider } from 'fumadocs-ui/provider/next';

import { DocsAppShell } from '@/components/docs-app-shell';

export const metadata: Metadata = {
  title: 'SeasonalNet Docs',
  description: 'Public documentation frontend for SeasonalNet.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased transition-colors duration-300">
        <RootProvider search={{ enabled: false }}>
          <DocsAppShell>{children}</DocsAppShell>
        </RootProvider>
      </body>
    </html>
  );
}
