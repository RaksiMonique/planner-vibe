import { addDays, endOfMonth, format, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import type { WeekStartsOn } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { MoodEntry } from '../queries';

const MOOD_OPACITY: Record<number, string> = {
  1: 'opacity-20',
  2: 'opacity-40',
  3: 'opacity-60',
  4: 'opacity-80',
  5: 'opacity-100',
};

/** A month of check-ins: the dot darkens with mood, the small dot shows energy. */
export function MoodMonth({
  monthKey,
  entries,
  weekStartsOn,
  todayKey,
}: {
  monthKey: string;
  entries: MoodEntry[];
  weekStartsOn: WeekStartsOn;
  todayKey: string;
}) {
  const first = startOfMonth(parseISO(`${monthKey}-01`));
  const last = endOfMonth(first);
  const gridStart = startOfWeek(first, { weekStartsOn });
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const cells: Date[] = [];
  for (let d = gridStart; d <= last || cells.length % 7 !== 0; d = addDays(d, 1)) cells.push(d);
  const dayNames = Array.from({ length: 7 }, (_, i) => format(addDays(gridStart, i), 'EEEEE'));

  return (
    <div className="flex flex-col gap-1">
      <div className="text-muted-foreground grid grid-cols-7 text-center text-[11px]">
        {dayNames.map((n, i) => (
          <span key={i}>{n}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const key = format(d, 'yyyy-MM-dd');
          const inMonth = d.getMonth() === first.getMonth();
          const entry = byDate.get(key);
          return (
            <div
              key={key}
              className={cn(
                'flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border text-xs',
                !inMonth && 'opacity-30',
                key === todayKey && 'border-primary bg-secondary/60'
              )}
              title={
                entry
                  ? `${format(d, 'd MMM')}: mood ${entry.mood}, energy ${entry.energy}`
                  : format(d, 'd MMM')
              }
            >
              <span className="text-muted-foreground text-[10px]">{format(d, 'd')}</span>
              {entry ? (
                <span className="flex items-center gap-0.5">
                  <span
                    className={cn('bg-primary size-3 rounded-full', MOOD_OPACITY[entry.mood])}
                  />
                  <span
                    className={cn('bg-sage size-1.5 rounded-full', MOOD_OPACITY[entry.energy])}
                  />
                </span>
              ) : (
                <span className="bg-muted size-3 rounded-full" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
