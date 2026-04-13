import type { CSSProperties, ReactNode } from 'react';

import { DocsLayout } from 'fumadocs-ui/layouts/docs';

import { baseOptions } from '@/lib/layout.shared';
import { source } from '@/lib/source';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      {...baseOptions()}
      tree={source.getPageTree()}
      containerProps={{
        style: {
          ['--fd-banner-height' as string]: '3.75rem',
        } as CSSProperties,
      }}
    >
      {children}
    </DocsLayout>
  );
}
