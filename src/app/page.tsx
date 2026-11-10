import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Rendered per request so the Content Security Policy nonce in the proxy
// matches the one on this page's scripts. A prerendered page would carry a
// build-time nonce, and the browser would refuse to run its scripts.
export const dynamic = 'force-dynamic';

const SWATCHES = [
  ['Deep Burgundy', 'bg-burgundy'],
  ['Terracotta', 'bg-terracotta'],
  ['Muted Coral', 'bg-coral'],
  ['Soft Peach', 'bg-peach'],
  ['Warm Blush', 'bg-blush'],
  ['Warm Beige', 'bg-beige'],
  ['Muted Sage', 'bg-sage'],
] as const;

const PILLARS = [
  {
    title: 'One connected system',
    body: 'Lifelong aspirations break into annual, quarterly, monthly and weekly goals, then into tasks and habits, without entering anything twice.',
  },
  {
    title: 'Every record has a home',
    body: 'Tasks, habits, events, notes and reflections each belong to a Life Segment, so balance across life is visible, not guessed.',
  },
  {
    title: 'Review, then plan again',
    body: 'Daily journal, weekly reset, monthly and quarterly reviews feed the next plan.',
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-14 px-6 py-16 sm:py-24">
      <section className="flex flex-col gap-6">
        <p className="tracking-eyebrow text-muted-foreground text-xs uppercase">
          Release 0 · Foundation
        </p>
        <h1 className="font-heading max-w-2xl text-5xl leading-tight sm:text-6xl">Life Planner</h1>
        <p className="text-muted-foreground max-w-xl text-lg">
          Plan, organise, track and review every area of life, from this morning&apos;s routine to
          lifelong goals, in one calm place.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/auth/login" className={cn(buttonVariants({ size: 'lg' }))}>
            Sign in
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
          <Link
            href="/wireframe"
            className={cn(buttonVariants({ size: 'lg', variant: 'outline' }))}
          >
            View the dashboard wireframe
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {PILLARS.map((p) => (
          <Card key={p.title}>
            <CardHeader>
              <CardTitle className="font-heading text-xl">
                <h2>{p.title}</h2>
              </CardTitle>
              <CardDescription>{p.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <p className="tracking-eyebrow text-muted-foreground text-xs uppercase">Palette</p>
        <Card>
          <CardContent className="flex flex-wrap gap-4">
            {SWATCHES.map(([name, cls]) => (
              <div key={name} className="flex items-center gap-2 text-sm">
                <span className={`size-6 rounded-full border ${cls}`} aria-hidden />
                {name}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
