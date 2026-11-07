import Link from 'next/link';
import { ActivityIcon } from 'lucide-react';
import { SegmentDot } from '@/components/shared/segment-badge';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { getPreferences } from '@/features/settings/service';
import { cn } from '@/lib/utils';
import { getHabitOverview } from '../queries';
import { PERIOD_NOUN } from '../schema';
import { habitAccent, streakLabel } from './habit-card';
import { HabitToggle } from './habit-toggle';

/** Today's habit checklist with streaks. */
export async function HabitsDashboardCard({
  userId,
  todayKey,
}: {
  userId: string;
  todayKey: string;
}) {
  const prefs = await getPreferences(userId);
  const habits = await getHabitOverview(userId, todayKey, prefs.weekStartsOn);
  const done = habits.filter((h) => h.doneToday).length;

  return (
    <DashboardCard title="Habits today" icon={ActivityIcon} href="/habits" release={2}>
      {habits.length === 0 ? (
        <EmptyNote>
          No habits yet.{' '}
          <Link href="/habits" className="text-primary hover:underline">
            Add the first one.
          </Link>
        </EmptyNote>
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            {done} of {habits.length} checked in today.
          </p>
          <ul className="flex flex-col gap-1.5">
            {habits.map((h) => (
              <li key={h.id} className="flex items-center gap-2.5 text-sm">
                <HabitToggle
                  key={`${h.id}:${todayKey}:${h.doneToday}`}
                  habitId={h.id}
                  dateKey={todayKey}
                  done={h.doneToday}
                  label={
                    h.doneToday ? `Remove today's check-in for ${h.name}` : `Check in ${h.name}`
                  }
                />
                <SegmentDot accent={habitAccent(h)} />
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate',
                    h.doneToday && 'text-muted-foreground line-through'
                  )}
                >
                  {h.name}
                </span>
                <span className="text-muted-foreground hidden text-xs sm:inline">
                  {h.frequency === 'daily'
                    ? streakLabel(h)
                    : `${h.stats.period.count}/${h.stats.period.target} this ${PERIOD_NOUN[h.frequency]}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </DashboardCard>
  );
}
