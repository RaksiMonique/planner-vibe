import type { HabitOverview } from '@/features/habits/queries';

/** A habit still owed today: daily ones unchecked, others short of their period target. */
export function habitsDueToday(habits: HabitOverview[]): HabitOverview[] {
  return habits.filter(
    (h) => !h.doneToday && (h.frequency === 'daily' || h.stats.period.count < h.stats.period.target)
  );
}
