import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { DashboardCard } from '@/features/dashboard/components/dashboard-card';
import type { WeekStartsOn } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { getMonthMarks } from '../queries';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** A small calendar of the month: today highlighted, a dot on days with something on. */
export async function MonthGlanceDashboardCard({
  userId,
  todayKey,
  timeZone,
  weekStartsOn,
}: {
  userId: string;
  todayKey: string;
  timeZone: string;
  weekStartsOn: WeekStartsOn;
}) {
  const rows = await getMonthMarks(userId, todayKey, timeZone, weekStartsOn);
  const letters = Array.from({ length: 7 }, (_, i) => DAY_LETTERS[(weekStartsOn + i) % 7]);
  const busy = rows.flatMap((r) => r.cells).filter((c) => c.inMonth && c.marked).length;

  return (
    <DashboardCard title="Month at a glance" icon={CalendarIcon} href="/month" release={6}>
      <p className="text-muted-foreground text-xs">
        {format(parseISO(todayKey), 'MMMM yyyy')}.{' '}
        {busy === 0
          ? 'Nothing dated this month yet.'
          : `${busy} ${busy === 1 ? 'day has' : 'days have'} something on.`}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {letters.map((letter, i) => (
          <span key={i} className="text-muted-foreground font-medium" aria-hidden>
            {letter}
          </span>
        ))}
        {rows.flatMap((row) =>
          row.cells.map((cell) => (
            <Link
              key={cell.key}
              href={`/calendar?date=${cell.key}`}
              aria-label={format(parseISO(cell.key), 'EEEE d MMMM')}
              aria-current={cell.isToday ? 'date' : undefined}
              className={cn(
                'hover:bg-muted/60 flex aspect-square flex-col items-center justify-center rounded-md tabular-nums',
                cell.inMonth ? 'text-foreground' : 'text-muted-foreground/50',
                cell.isToday && 'bg-secondary text-primary font-medium'
              )}
            >
              <span className="leading-none">{Number(cell.key.slice(8, 10))}</span>
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 size-1 rounded-full',
                  cell.marked && cell.inMonth ? 'bg-primary' : 'bg-transparent'
                )}
              />
            </Link>
          ))
        )}
      </div>
    </DashboardCard>
  );
}
