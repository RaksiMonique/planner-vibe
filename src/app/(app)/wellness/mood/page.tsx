import type { Metadata } from 'next';
import Link from 'next/link';
import { addMonths, format, parseISO, subDays } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { MoodCheckIn } from '@/features/wellness/components/mood-check-in';
import { MoodMonth } from '@/features/wellness/components/mood-month';
import { MoodTrend } from '@/features/wellness/components/mood-trend';
import { getMoodForDate, getWellnessPrefs, listMoodBetween } from '@/features/wellness/queries';
import { ENERGY_WORDS, MOOD_WORDS } from '@/features/wellness/schema';
import {
  averages,
  bestAndWorst,
  checkInStreak,
  lastDays,
  weeklyAverages,
} from '@/features/wellness/stats';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone } from '@/lib/dates';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Mood and energy' };
export const dynamic = 'force-dynamic';

type Search = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

export default async function MoodPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const params = await searchParams;
  const prefs = await getWellnessPrefs(user.id);
  const today = todayInZone(prefs.timeZone);
  const todayKey = toDateKey(today);
  const monthKey = /^\d{4}-\d{2}$/.test(str(params.month) ?? '')
    ? (str(params.month) as string)
    : todayKey.slice(0, 7);
  const monthStart = parseISO(`${monthKey}-01`);
  const monthEndKey = toDateKey(subDays(addMonths(monthStart, 1), 1));

  const thirty = lastDays(todayKey, 30);
  const [entry, last30, last56, streakRows, monthEntries] = await Promise.all([
    getMoodForDate(user.id, todayKey),
    listMoodBetween(user.id, thirty[0], todayKey),
    listMoodBetween(user.id, toDateKey(subDays(today, 55)), todayKey),
    listMoodBetween(user.id, toDateKey(subDays(today, 400)), todayKey),
    listMoodBetween(user.id, toDateKey(monthStart), monthEndKey),
  ]);
  const byDate = new Map(last30.map((e) => [e.date, e]));
  const trend = thirty.map((date) => ({
    date,
    mood: byDate.get(date)?.mood ?? null,
    energy: byDate.get(date)?.energy ?? null,
  }));
  const avg = averages(last30);
  const { best, worst } = bestAndWorst(last30);
  const streak = checkInStreak(
    streakRows.map((e) => e.date),
    todayKey
  );
  const weeks = weeklyAverages(last56, prefs.weekStartsOn).slice(-8);
  const prevMonth = format(addMonths(monthStart, -1), 'yyyy-MM');
  const nextMonth = format(addMonths(monthStart, 1), 'yyyy-MM');

  return (
    <>
      <PageHeader
        eyebrow="Wellness"
        title="Mood and energy"
        description="A quick check-in each day. Trends appear as the days add up."
      />
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              <h2>{entry ? 'Today, so far' : 'How are you today?'}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MoodCheckIn
              key={entry?.updatedAt?.toString() ?? 'new'}
              dateKey={todayKey}
              entry={entry}
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              <h2>Last 30 days</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Stat label="Check-in streak" value={`${streak} day${streak === 1 ? '' : 's'}`} />
              <Stat label="Average mood" value={avg.mood === null ? '–' : `${avg.mood} / 5`} />
              <Stat
                label="Average energy"
                value={avg.energy === null ? '–' : `${avg.energy} / 5`}
              />
              <Stat label="Check-ins" value={`${last30.length} of 30`} />
            </dl>
            <MoodTrend days={trend} />
            {(best || worst) && (
              <p className="text-muted-foreground text-xs">
                {best &&
                  `Best day ${format(parseISO(best.date), 'EEE d MMM')} (${MOOD_WORDS[best.mood]})`}
                {best && worst && best.date !== worst.date && ' · '}
                {worst &&
                  best?.date !== worst.date &&
                  `Hardest ${format(parseISO(worst.date), 'EEE d MMM')} (${MOOD_WORDS[worst.mood]}, ${ENERGY_WORDS[worst.energy].toLowerCase()})`}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              <h2>Weekly averages</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeks.length === 0 ? (
              <p className="text-muted-foreground text-sm">No weeks with check-ins yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-muted-foreground text-xs">
                  <tr>
                    <th className="py-1 text-left font-medium">Week of</th>
                    <th className="py-1 text-right font-medium">Mood</th>
                    <th className="py-1 text-right font-medium">Energy</th>
                    <th className="py-1 text-right font-medium">Days</th>
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((w) => (
                    <tr key={w.weekStart} className="border-t">
                      <td className="py-1.5">{format(parseISO(w.weekStart), 'd MMM')}</td>
                      <td className="py-1.5 text-right tabular-nums">{w.mood}</td>
                      <td className="py-1.5 text-right tabular-nums">{w.energy}</td>
                      <td className="text-muted-foreground py-1.5 text-right tabular-nums">
                        {w.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader className="items-center">
            <CardTitle className="font-heading text-lg">
              <h2>{format(monthStart, 'MMMM yyyy')}</h2>
            </CardTitle>
            <div className="col-start-2 row-start-1 flex gap-1 justify-self-end">
              <Link
                href={`/wellness/mood?month=${prevMonth}`}
                aria-label="Previous month"
                className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))}
              >
                <ChevronLeftIcon />
              </Link>
              <Link
                href={`/wellness/mood?month=${nextMonth}`}
                aria-label="Next month"
                className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))}
              >
                <ChevronRightIcon />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <MoodMonth
              monthKey={monthKey}
              entries={monthEntries}
              weekStartsOn={prefs.weekStartsOn}
              todayKey={todayKey}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-heading text-xl">{value}</dd>
    </div>
  );
}
