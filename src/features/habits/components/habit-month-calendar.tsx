import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyNote } from '@/features/dashboard/components/dashboard-card';
import type { WeekStartsOn } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { HabitOverview } from '../queries';
import { isFutureKey } from '../streaks';
import { HabitToggle } from './habit-toggle';
import { MonthNav } from './month-nav';
import { buildHabitsHref } from '../hrefs';

export function HabitMonthCalendar({
  habit,
  habits,
  monthKey,
  todayKey,
  weekStartsOn,
  params,
}: {
  habit?: HabitOverview;
  habits: HabitOverview[];
  /** yyyy-MM */
  monthKey: string;
  todayKey: string;
  weekStartsOn: WeekStartsOn;
  /** Current search params to keep while navigating. */
  params: Record<string, string | undefined>;
}) {
  const first = parseISO(`${monthKey}-01`);
  const days = eachDayOfInterval({
    start: startOfWeek(first, { weekStartsOn }),
    end: endOfWeek(endOfMonth(first), { weekStartsOn }),
  });
  const headers = days.slice(0, 7).map((d) => format(d, 'EEE'));
  const checkIns = new Set(habit?.checkInDates ?? []);
  const inMonth = habit ? habit.checkInDates.filter((k) => k.startsWith(monthKey)).length : 0;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <MonthNav
          title={format(first, 'MMMM yyyy')}
          prevHref={buildHabitsHref({ ...params, month: format(subMonths(first, 1), 'yyyy-MM') })}
          nextHref={buildHabitsHref({ ...params, month: format(addMonths(first, 1), 'yyyy-MM') })}
          habits={habits.map((h) => ({ id: h.id, name: h.name }))}
          selectedId={habit?.id}
          params={params}
        />
        {!habit ? (
          <EmptyNote>Create a habit to see its monthly calendar.</EmptyNote>
        ) : (
          <>
            <p className="text-muted-foreground text-xs">
              {habit.name}: {inMonth} check-in{inMonth === 1 ? '' : 's'} this month. Tap a past day
              to add or remove one.
            </p>
            <div className="grid grid-cols-7 gap-1">
              {headers.map((h) => (
                <div
                  key={h}
                  className="text-muted-foreground text-center text-[11px] font-medium uppercase"
                >
                  {h}
                </div>
              ))}
              {days.map((day) => {
                const key = format(day, 'yyyy-MM-dd');
                const outside = !isSameMonth(day, first);
                const future = isFutureKey(key, todayKey);
                const done = checkIns.has(key);
                return (
                  <div
                    key={key}
                    className={cn(
                      'flex flex-col items-center gap-0.5 rounded-md py-1',
                      key === todayKey && 'bg-secondary/60',
                      outside && 'opacity-40'
                    )}
                  >
                    <span className="text-[11px] tabular-nums">{format(day, 'd')}</span>
                    <HabitToggle
                      key={`${habit.id}:${key}:${done}`}
                      variant="cell"
                      habitId={habit.id}
                      dateKey={key}
                      done={done}
                      disabled={future}
                      label={`${habit.name} on ${format(day, 'EEEE d MMMM')}`}
                      className="size-6"
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
