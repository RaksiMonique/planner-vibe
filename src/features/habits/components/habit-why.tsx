import { cn } from '@/lib/utils';
import type { HabitOverview } from '../queries';

/**
 * The habit has slipped: the streak broke, or under half of the last 30 days.
 * That is when the reason for the habit is worth seeing again.
 */
export function hasSlipped(h: HabitOverview): boolean {
  const { currentStreak, longestStreak, rate30 } = h.stats;
  return (currentStreak === 0 && longestStreak > 0) || rate30 < 50;
}

/** The habit's why as one muted line, only while the habit has slipped. */
export function SlippedWhy({ habit, className }: { habit: HabitOverview; className?: string }) {
  if (!habit.why || !hasSlipped(habit)) return null;
  return (
    <p
      className={cn('text-muted-foreground truncate text-xs italic', className)}
      data-slot="slipped-why"
    >
      “{habit.why}”
    </p>
  );
}
