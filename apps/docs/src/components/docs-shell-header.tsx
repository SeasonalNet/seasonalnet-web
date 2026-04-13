"use client";

import { ModeToggle } from '@seasonalnet/shell/src/components/mode-toggle';
import { ShellHeader } from '@seasonalnet/shell/src/components/site-header';

import { site } from '@/lib/site';

export function DocsShellHeader() {
  return <ShellHeader site={site} rightSlot={<ModeToggle />} />;
}
