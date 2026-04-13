import Link from 'next/link';
import { ArrowRight, BookText, FileStack, GitBranch, ShieldCheck } from 'lucide-react';

import { Badge } from '@seasonalnet/shell/src/components/ui/badge';
import { Button } from '@seasonalnet/shell/src/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@seasonalnet/shell/src/components/ui/card';
import { Separator } from '@seasonalnet/shell/src/components/ui/separator';

const nextSteps = [
  {
    title: 'Shared shell wrapped',
    body: 'The docs app now uses the standard SeasonalNet header, announcements rail, and footer across both the landing page and /docs routes.',
    icon: BookText,
  },
  {
    title: 'Keep local docs small',
    body: 'Continue proving the local docs tree before introducing publish policy and sync logic from the canonical docs repository.',
    icon: FileStack,
  },
  {
    title: 'Define publish rules next',
    body: 'Write the allowlist and exclusions before any seasonalnet-docs copy or sync step is introduced.',
    icon: ShieldCheck,
  },
  {
    title: 'Add sync after policy',
    body: 'Only copy allowlisted docs at build or deploy time. Never fetch the docs repo per request.',
    icon: GitBranch,
  },
] as const;

export default function Page() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Card className="rounded-3xl">
        <CardContent className="p-8">
          <div className="max-w-3xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full">docs</Badge>
              <Badge variant="outline" className="rounded-full">fumadocs</Badge>
              <Badge variant="outline" className="rounded-full">shared shell</Badge>
            </div>

            <h1 className="text-4xl font-semibold tracking-tight">SeasonalNet Docs</h1>
            <p className="mt-3 text-muted-foreground">
              This workspace is the dedicated documentation frontend. It now renders local Fumadocs content
              under <code className="rounded bg-muted px-1 py-0.5 text-sm">/docs</code> while staying inside
              the standard SeasonalNet shell.
            </p>

            <div className="mt-6">
              <Button asChild className="rounded-full">
                <Link href="/docs">
                  Open local docs
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-10">
        <div>
          <div className="text-xs text-muted-foreground">Phase 3</div>
          <h2 className="text-2xl font-semibold tracking-tight">Shared shell integration</h2>
        </div>

        <Separator className="my-6" />

        <div className="grid gap-4 md:grid-cols-2">
          {nextSteps.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="rounded-2xl">
                <CardHeader className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="rounded-xl border bg-background p-2">
                      <Icon className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </div>
                  <CardDescription>{item.body}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}
