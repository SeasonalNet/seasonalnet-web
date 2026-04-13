import type { ReactNode } from 'react';

import { SiteAnnouncements } from '@seasonalnet/shell/src/components/site-announcements';
import { ShellFooter } from '@seasonalnet/shell/src/components/site-footer';

import { DocsShellHeader } from '@/components/docs-shell-header';

import { site } from '@/lib/site';

type DocsAppShellProps = {
  children: ReactNode;
};

export function DocsAppShell({ children }: DocsAppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <DocsShellHeader />

      <div className="mx-auto w-full max-w-6xl px-4">
        <SiteAnnouncements />
      </div>

      <div className="flex-1">{children}</div>

      <ShellFooter site={site} />
    </div>
  );
}
