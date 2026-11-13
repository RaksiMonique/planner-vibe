import type { Metadata } from 'next';
import Link from 'next/link';
import { addDays, endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { SegmentBadge } from '@/components/shared/segment-badge';
import { GratitudeList } from '@/features/journal/components/gratitude-list';
import { JournalDayEditor } from '@/features/journal/components/journal-day-editor';
import { JournalTimeline, journalHref } from '@/features/journal/components/journal-timeline';
import { getDayEntries, listEntriesBetween, listRecentEntries } from '@/features/journal/queries';
import { excerpt } from '@/features/journal/schema';
import { listSegments } from '@/features/life-segments/service';
import { getPreferences } from '@/features/settings/service';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone } from '@/lib/dates';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Journal' };
export const dynamic = 'force-dynamic';

type Search = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

export default async function JournalPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const params = await searchParams;
  const prefs = await getPreferences(user.id);
  const todayKey = toDateKey(todayInZone(prefs.timeZone));
  const dateParam = str(params.date);
  const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(dateParam ?? '') ? (dateParam as string) : todayKey;
  const monthParam = str(params.month);
  const monthKey = /^\d{4}-\d{2}$/.test(monthParam ?? '')
    ? (monthParam as string)
    : dateKey.slice(0, 7);
  const monthStart = startOfMonth(parseISO(`${monthKey}-01`));
  const date = parseISO(dateKey);

  const [segments, day, monthEntries, recent] = await Promise.all([
    listSegments(user.id),
    getDayEntries(user.id, dateKey),
    listEntriesBetween(user.id, toDateKey(monthStart), toDateKey(endOfMonth(monthStart))),
    listRecentEntries(user.id, 15),
  ]);
  const defaultSegmentId = segments.find((s) => s.slug === 'growth')?.id ?? segments[0]?.id ?? '';
  const prevKey = toDateKey(addDays(date, -1));
  const nextKey = toDateKey(addDays(date, 1));

  return (
    <>
      <PageHeader
        title="Journal"
        description="A few honest lines a day, and three things to be grateful for."
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link
          href={journalHref({ date: prevKey, month: prevKey.slice(0, 7) })}
          aria-label="Previous day"
          className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))}
        >
          <ChevronLeftIcon />
        </Link>
        <Link
          href={journalHref({ date: todayKey })}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          Today
        </Link>
        <Link
          href={journalHref({ date: nextKey, month: nextKey.slice(0, 7) })}
          aria-label="Next day"
          className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))}
        >
          <ChevronRightIcon />
        </Link>
        <h2 className="font-heading ml-1 text-xl">{format(date, 'EEEE, d MMMM yyyy')}</h2>
        {dateKey === todayKey && (
          <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs">
            Today
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                <h2>{day.daily ? 'Journal entry' : 'Write today'}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <JournalDayEditor
                dateKey={dateKey}
                entry={day.daily}
                segments={segments}
                defaultSegmentId={defaultSegmentId}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                <h2>Grateful for</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GratitudeList
                dateKey={dateKey}
                entry={day.gratitude}
                defaultSegmentId={defaultSegmentId}
              />
            </CardContent>
          </Card>
          {day.others.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-lg">
                  <h2>Also on this day</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {day.others.map((e) => (
                    <li key={e.id} className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-2 text-xs">
                        <SegmentBadge name={e.segment.name} accent={e.segment.accent} />
                        <span className="text-muted-foreground capitalize">{e.kind}</span>
                      </span>
                      <span className="text-sm">{e.title ?? excerpt(e.content, 200)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
        <div className="lg:col-span-4">
          <JournalTimeline
            monthKey={monthKey}
            selectedKey={dateKey}
            todayKey={todayKey}
            monthEntries={monthEntries}
            recent={recent}
          />
        </div>
      </div>
    </>
  );
}
