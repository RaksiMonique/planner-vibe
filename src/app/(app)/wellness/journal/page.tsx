import type { Metadata } from 'next';
import Link from 'next/link';
import { addDays, addMonths, format, parseISO, startOfMonth, startOfWeek, subDays } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { listEntriesBetween } from '@/features/journal/queries';
import { excerpt } from '@/features/journal/schema';
import { WellnessJournalEditor } from '@/features/wellness/components/wellness-journal-editor';
import { getWellnessPrefs } from '@/features/wellness/queries';
import {
  SCOPE_TITLES,
  WELLNESS_JOURNAL_SCOPES,
  type WellnessJournalScope,
} from '@/features/wellness/schema';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone } from '@/lib/dates';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Wellness journal' };
export const dynamic = 'force-dynamic';

type Search = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

export default async function WellnessJournalPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const prefs = await getWellnessPrefs(user.id);
  const today = todayInZone(prefs.timeZone);
  const scopeParam = str(params.scope);
  const scope: WellnessJournalScope = WELLNESS_JOURNAL_SCOPES.includes(
    scopeParam as WellnessJournalScope
  )
    ? (scopeParam as WellnessJournalScope)
    : 'daily';
  const dateParam = str(params.date);
  const picked = /^\d{4}-\d{2}-\d{2}$/.test(dateParam ?? '')
    ? parseISO(dateParam as string)
    : today;
  const period =
    scope === 'weekly'
      ? startOfWeek(picked, { weekStartsOn: prefs.weekStartsOn })
      : scope === 'monthly'
        ? startOfMonth(picked)
        : picked;
  const periodKey = toDateKey(period);
  const step = (dir: 1 | -1) =>
    scope === 'weekly'
      ? addDays(period, 7 * dir)
      : scope === 'monthly'
        ? addMonths(period, dir)
        : addDays(period, dir);
  const title = SCOPE_TITLES[scope];
  const periodLabel =
    scope === 'weekly'
      ? `Week of ${format(period, 'd MMM yyyy')}`
      : scope === 'monthly'
        ? format(period, 'MMMM yyyy')
        : format(period, 'EEEE, d MMMM yyyy');

  const [onDate, recent] = await Promise.all([
    listEntriesBetween(user.id, periodKey, periodKey, { kind: 'wellness' }),
    listEntriesBetween(user.id, toDateKey(subDays(today, 90)), toDateKey(today), {
      kind: 'wellness',
    }),
  ]);
  const entry = onDate.find((e) => e.title === title) ?? null;
  const href = (s: WellnessJournalScope, d: Date) =>
    `/wellness/journal?scope=${s}&date=${toDateKey(d)}`;

  return (
    <>
      <PageHeader
        eyebrow="Wellness"
        title="Wellness journal"
        description="How your body and mind are doing, by day, week or month."
        actions={
          <div className="flex gap-1" role="tablist" aria-label="Journal scope">
            {WELLNESS_JOURNAL_SCOPES.map((s) => (
              <Link
                key={s}
                href={href(s, picked)}
                role="tab"
                aria-selected={s === scope}
                className={cn(
                  buttonVariants({ variant: s === scope ? 'secondary' : 'ghost', size: 'sm' }),
                  'capitalize'
                )}
              >
                {s}
              </Link>
            ))}
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader className="items-center">
            <CardTitle className="font-heading text-lg">
              <h2>{periodLabel}</h2>
            </CardTitle>
            <div className="col-start-2 row-start-1 flex gap-1 justify-self-end">
              <Link
                href={href(scope, step(-1))}
                aria-label="Previous"
                className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))}
              >
                <ChevronLeftIcon />
              </Link>
              <Link
                href={href(scope, today)}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                Today
              </Link>
              <Link
                href={href(scope, step(1))}
                aria-label="Next"
                className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))}
              >
                <ChevronRightIcon />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <WellnessJournalEditor
              scope={scope}
              dateKey={periodKey}
              entry={entry ? { id: entry.id, content: entry.content } : null}
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              <h2>Recent</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No wellness entries in the last 90 days.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {recent.slice(0, 12).map((e) => {
                  const s =
                    (Object.keys(SCOPE_TITLES) as WellnessJournalScope[]).find(
                      (k) => SCOPE_TITLES[k] === e.title
                    ) ?? 'daily';
                  return (
                    <li key={e.id} className="flex flex-col gap-0.5">
                      <Link
                        href={href(s, parseISO(e.date))}
                        className="text-primary text-xs hover:underline"
                      >
                        {format(parseISO(e.date), 'EEE d MMM')} · {s}
                      </Link>
                      <p className="text-sm">{excerpt(e.content, 120)}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
