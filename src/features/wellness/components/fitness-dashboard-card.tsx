import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { DumbbellIcon } from 'lucide-react';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { toDateKey, weekDays, type WeekStartsOn } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { listWellnessBetween } from '../queries';
import { sumValues } from '../stats';

const PREVIEW = 6;

const minutes = (value: string | null) => {
  const n = Number(value ?? 0);
  return n > 0 ? `${n % 1 === 0 ? n : n.toFixed(1)} min` : '';
};

/** This week's workouts, those already logged and those still ahead, with the minutes so far. */
export async function FitnessDashboardCard({
  userId,
  todayKey,
  weekStartsOn,
}: {
  userId: string;
  todayKey: string;
  timeZone: string;
  weekStartsOn: WeekStartsOn;
}) {
  const weekKeys = weekDays(parseISO(todayKey), weekStartsOn).map(toDateKey);
  const workouts = await listWellnessBetween(userId, weekKeys[0], weekKeys[6], ['fitness']);
  const isDone = (w: (typeof workouts)[number]) => w.date <= todayKey;
  const done = workouts.filter(isDone);
  const total = sumValues(done);
  // Upcoming ones first so the plan is visible, then what is already logged.
  const shown = [...workouts]
    .sort((a, b) => Number(isDone(a)) - Number(isDone(b)) || a.date.localeCompare(b.date))
    .slice(0, PREVIEW);
  const more = workouts.length - shown.length;

  return (
    <DashboardCard title="Fitness" icon={DumbbellIcon} href="/wellness/fitness" release={6}>
      {workouts.length === 0 ? (
        <EmptyNote>
          Nothing planned this week.{' '}
          <Link href="/wellness/fitness" className="text-primary link">
            Log a workout.
          </Link>
        </EmptyNote>
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            {done.length === workouts.length
              ? `${done.length} ${done.length === 1 ? 'workout' : 'workouts'} this week`
              : `${done.length} of ${workouts.length} done this week`}
            {total > 0 ? `, ${total % 1 === 0 ? total : total.toFixed(1)} min.` : '.'}
          </p>
          <ul className="flex flex-col gap-1.5">
            {shown.map((w) => {
              const finished = isDone(w);
              return (
                <li key={w.id} className="flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      'size-2 shrink-0 rounded-full',
                      finished ? 'bg-rose' : 'border-input border'
                    )}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      'w-11 shrink-0 text-xs tabular-nums',
                      w.date === todayKey ? 'text-primary font-medium' : 'text-muted-foreground'
                    )}
                  >
                    {w.date === todayKey ? 'Today' : format(parseISO(w.date), 'EEE d')}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{w.label ?? 'Workout'}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {minutes(w.value)}
                  </span>
                </li>
              );
            })}
          </ul>
          {more > 0 && (
            <Link href="/wellness/fitness" className="text-primary link text-xs">
              {more} more on the Fitness page
            </Link>
          )}
        </>
      )}
    </DashboardCard>
  );
}
