import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import type { HabitOverview } from '../queries';

/** The one line that answers "what do I do now?": the next plan item, else what the link says. */
export function nextUpText(habit: HabitOverview, todayKey?: string): string | null {
  const item = habit.plan.next;
  if (item) {
    const date = item.plannedDate;
    if (date && todayKey && date > todayKey) {
      return `${item.title} · ${format(parseISO(date), 'EEE d MMM')}`;
    }
    return item.title;
  }
  return habit.link?.next ?? null;
}

export function NextUp({
  habit,
  todayKey,
  className,
}: {
  habit: HabitOverview;
  todayKey?: string;
  className?: string;
}) {
  const text = nextUpText(habit, todayKey);
  if (!text) return null;
  return (
    <Link
      href={`/habits/${habit.id}`}
      className={cn(
        'text-muted-foreground hover:text-foreground block truncate text-xs',
        className
      )}
    >
      <span className="text-primary">Next:</span> {text}
    </Link>
  );
}
