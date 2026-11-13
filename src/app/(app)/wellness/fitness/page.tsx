import type { Metadata } from 'next';
import Link from 'next/link';
import { addDays, format, parseISO, subDays } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { EntryList } from '@/features/wellness/components/entry-list';
import { WellnessLogForm } from '@/features/wellness/components/wellness-log-form';
import { getWellnessPrefs, listWellnessBetween } from '@/features/wellness/queries';
import { lastDays, sumValues, totalsByDay } from '@/features/wellness/stats';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone, weekDays } from '@/lib/dates';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Fitness' };
export const dynamic = 'force-dynamic';

type Search = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

export default async function FitnessPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const params = await searchParams;
  const prefs = await getWellnessPrefs(user.id);
  const today = todayInZone(prefs.timeZone);
  const todayKey = toDateKey(today);
  const weekParam = str(params.week);
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(weekParam ?? '')
    ? parseISO(weekParam as string)
    : today;
  const weekKeys = weekDays(anchor, prefs.weekStartsOn).map(toDateKey);
  const seven = lastDays(todayKey, 7);

  const [weekFitness, recent, cycle] = await Promise.all([
    listWellnessBetween(user.id, weekKeys[0], weekKeys[6], ['fitness']),
    listWellnessBetween(user.id, seven[0], todayKey, ['sleep', 'water']),
    prefs.cycleEnabled
      ? listWellnessBetween(user.id, toDateKey(subDays(today, 60)), todayKey, ['cycle'])
      : Promise.resolve([]),
  ]);
  const minutesByDay = totalsByDay(weekFitness, weekKeys);
  const weekMinutes = sumValues(weekFitness);
  const sleep = recent.filter((e) => e.kind === 'sleep');
  const water = recent.filter((e) => e.kind === 'water');
  const sleepByDay = totalsByDay(sleep, seven);
  const waterByDay = totalsByDay(water, seven);
  const prevWeek = toDateKey(addDays(parseISO(weekKeys[0]), -7));
  const nextWeek = toDateKey(addDays(parseISO(weekKeys[0]), 7));

  return (
    <>
      <PageHeader
        title="Fitness"
        description="Movement for the week, with sleep and water alongside."
      />
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-12">
          <CardHeader className="items-center">
            <CardTitle className="font-heading text-lg">
              <h2>
                Week of {format(parseISO(weekKeys[0]), 'd MMM')} · {weekMinutes} min
              </h2>
            </CardTitle>
            <div className="col-start-2 row-start-1 flex gap-1 justify-self-end">
              <Link
                href={`/wellness/fitness?week=${prevWeek}`}
                aria-label="Previous week"
                className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))}
              >
                <ChevronLeftIcon />
              </Link>
              <Link
                href="/wellness/fitness"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                This week
              </Link>
              <Link
                href={`/wellness/fitness?week=${nextWeek}`}
                aria-label="Next week"
                className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))}
              >
                <ChevronRightIcon />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-7 gap-1.5">
              {weekKeys.map((key) => {
                const day = weekFitness.filter((e) => e.date === key);
                return (
                  <div
                    key={key}
                    className={cn(
                      'flex min-h-24 flex-col gap-1 rounded-lg border p-2',
                      key === todayKey ? 'border-primary bg-secondary/60' : 'bg-card'
                    )}
                  >
                    <p className="text-muted-foreground text-[11px]">
                      {format(parseISO(key), 'EEE d')}
                    </p>
                    <p className="font-heading text-lg">
                      {minutesByDay[key]} <span className="text-muted-foreground text-xs">min</span>
                    </p>
                    {day.map((e) => (
                      <p key={e.id} className="truncate text-[11px]" title={e.label ?? ''}>
                        {e.label}
                      </p>
                    ))}
                  </div>
                );
              })}
            </div>
            <WellnessLogForm kind="fitness" dateKey={todayKey} submitLabel="Log workout" />
            <EntryList
              entries={[...weekFitness].reverse()}
              emptyText="No workouts logged this week."
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              <h2>Sleep, last 7 days</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Strip dayKeys={seven} values={sleepByDay} max={10} unit="h" todayKey={todayKey} />
            <WellnessLogForm kind="sleep" dateKey={todayKey} submitLabel="Log sleep" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              <h2>Water, last 7 days</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Strip dayKeys={seven} values={waterByDay} max={3} unit="L" todayKey={todayKey} />
            <WellnessLogForm kind="water" dateKey={todayKey} submitLabel="Log water" />
          </CardContent>
        </Card>

        <Card className="lg:col-span-12">
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              <h2>Cycle</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {prefs.cycleEnabled ? (
              <>
                <p className="text-muted-foreground text-xs">
                  Private: cycle entries never appear in exports or shared views.
                </p>
                <WellnessLogForm kind="cycle" dateKey={todayKey} submitLabel="Log" />
                <EntryList
                  entries={[...cycle].reverse()}
                  emptyText="Nothing logged in the last 60 days."
                />
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                Cycle tracking is off. Turn it on under{' '}
                <Link href="/settings" className="text-primary hover:underline">
                  Settings, Modules
                </Link>{' '}
                if you want it; it stays private either way.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Strip({
  dayKeys,
  values,
  max,
  unit,
  todayKey,
}: {
  dayKeys: string[];
  values: Record<string, number>;
  max: number;
  unit: string;
  todayKey: string;
}) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {dayKeys.map((key) => {
        const v = values[key] ?? 0;
        return (
          <div key={key} className="flex flex-col items-center gap-1">
            <div className="bg-muted flex h-16 w-full items-end overflow-hidden rounded-md">
              <div
                className="bg-sage w-full rounded-t-md"
                style={{ height: `${Math.min(100, (v / max) * 100)}%` }}
              />
            </div>
            <span className="text-xs tabular-nums">
              {v ? `${v % 1 === 0 ? v : v.toFixed(1)}${unit}` : '–'}
            </span>
            <span
              className={cn(
                'text-muted-foreground text-[10px]',
                key === todayKey && 'text-primary font-medium'
              )}
            >
              {format(parseISO(key), 'EEE')}
            </span>
          </div>
        );
      })}
    </div>
  );
}
