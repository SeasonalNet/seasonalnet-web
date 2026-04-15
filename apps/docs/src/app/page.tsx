import type { ComponentType } from 'react';
import Link from 'next/link';
import { ArrowRight, House, Map, Network, Phone, ShieldCheck, Workflow } from 'lucide-react';

import { Badge } from '@seasonalnet/shell/src/components/ui/badge';
import { Button } from '@seasonalnet/shell/src/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@seasonalnet/shell/src/components/ui/card';
import { Separator } from '@seasonalnet/shell/src/components/ui/separator';

const sections = [
  {
    title: 'Network overview',
    body: 'Top-level segment index, routing relationships, and public infrastructure boundaries for SeasonalNet.',
    href: '/docs/network',
    icon: Network,
  },
  {
    title: 'LAN maps',
    body: 'Detailed references for Main LAN, SeasonalCME, and Phone-LAN with addressing, topology, and device placement notes.',
    href: '/docs/network/lans',
    icon: Map,
  },
  {
    title: 'Publication scope',
    body: 'This site publishes public reference material only. Sensitive host internals, credentials, and private operational detail are intentionally excluded.',
    href: '/docs',
    icon: ShieldCheck,
  },
] as const;

const quickLinks = [
  {
    title: 'Main LAN',
    body: 'Core network documentation for the main SeasonalNet segment, addressing, and device layout.',
    href: '/docs/network/lans/main-lan',
    icon: House,
  },
  {
    title: 'SeasonalCME',
    body: 'Routing, call control, and Cisco lab documentation for the SeasonalCME environment.',
    href: '/docs/network/lans/seasonalcme',
    icon: Workflow,
  },
  {
    title: 'Phone-LAN',
    body: 'Phone and voice-endpoint LAN reference for dedicated voice devices and supporting links.',
    href: '/docs/network/lans/phone-lan',
    icon: Phone,
  },
] as const;

type LinkCardProps = {
  title: string;
  body: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

function LinkCard({ title, body, href, icon: Icon }: LinkCardProps) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="h-full rounded-2xl transition-colors hover:bg-accent/40">
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="rounded-xl border bg-background p-2">
                <Icon className="h-4 w-4" />
              </div>
              <CardTitle className="text-base">{title}</CardTitle>
            </div>
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
          <CardDescription>{body}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}

export default function Page() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Card className="rounded-3xl">
        <CardContent className="p-8">
          <div className="max-w-3xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full">docs</Badge>
              <Badge variant="outline" className="rounded-full">public reference</Badge>
              <Badge variant="outline" className="rounded-full">network documentation</Badge>
            </div>

            <h1 className="text-4xl font-semibold tracking-tight">SeasonalNet Documentation</h1>
            <p className="mt-3 text-muted-foreground">
              Public reference documentation for SeasonalNet infrastructure, network topology, and LAN maps.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="rounded-full">
                <Link href="/docs">
                  Browse docs
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button asChild variant="outline" className="rounded-full">
                <Link href="/docs/network">Network overview</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-10">
        <div>
          <div className="text-xs text-muted-foreground">Start here</div>
          <h2 className="text-2xl font-semibold tracking-tight">What&apos;s here</h2>
        </div>

        <Separator className="my-6" />

        <div className="grid gap-4 md:grid-cols-3">
          {sections.map((item) => (
            <LinkCard
              key={item.title}
              title={item.title}
              body={item.body}
              href={item.href}
              icon={item.icon}
            />
          ))}
        </div>
      </div>

      <div className="mt-10">
        <div>
          <div className="text-xs text-muted-foreground">Common entry points</div>
          <h2 className="text-2xl font-semibold tracking-tight">Quick links</h2>
        </div>

        <Separator className="my-6" />

        <div className="grid gap-4 md:grid-cols-3">
          {quickLinks.map((item) => (
            <LinkCard
              key={item.href}
              title={item.title}
              body={item.body}
              href={item.href}
              icon={item.icon}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
