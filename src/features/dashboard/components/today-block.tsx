import Link from 'next/link';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { CalendarClockIcon, ListChecksIcon, TriangleAlertIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SegmentDot } from '@/components/shared/segment-badge';
import type { EventRow } from '@/features/calendar/queries';
import { habitAccent } from '@/features/habits/components/habit-card';
import { HabitToggle } from '@/features/habits/components/habit-toggle';
import { getHabitOverview } from '@/features/habits/queries';
import { habitsDueToday } from '../habits-due';
import { TaskRow } from '@/features/tasks/components/task-row';
import type { TaskRow as TaskRowData } from '@/features/tasks/queries';
import type { DueStatus, WeekStartsOn } from '@/lib/dates';
import { cn } from '@/lib/utils';

type Task = TaskRowData & { due: DueStatus };

function Section({
  title,
  icon: Icon,
  count,
  children,
  aside,
}: {
  title: string;
  icon: typeof ListChecksIcon;
  count: number;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5" aria-label={title}>
      <div className="flex items-center gap-2">
        <Icon className="text-primary size-4" aria-hidden />
        <h3 className="font-heading text-lg">
          {title} <span className="text-muted-foreground text-sm tabular-nums">({count})</span>
        </h3>
        {aside && <div className="ml-auto">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

const Quiet = ({ children }: { children: React.ReactNode }) => (
  <p className="text-muted-foreground px-1.5 py-1 text-sm">{children}</p>
);

/**
 * The day in one place, in the order it is tackled: what is due today
 * (events, tasks, habits), what is overdue, and what still needs a date.
 */
export async function TodayBlock({
  userId,
  todayKey,
  timeZone,
  weekStartsOn,
  habitsEnabled,
  events,
  dueToday,
  overdue,
  undated,
  undatedCount,
}: {
  userId: string;
  todayKey: string;
  timeZone: string;
  weekStartsOn: WeekStartsOn;
  habitsEnabled: boolean;
  events: EventRow[];
  dueToday: Task[];
  overdue: Task[];
  undated: Task[];
  undatedCount: number;
}) {
  const habits = habitsEnabled
    ? habitsDueToday(await getHabitOverview(userId, todayKey, weekStartsOn))
    : [];
  const editHref = (id: string) => `/tasks?task=${id}`;
  const timeOf = (e: EventRow) =>
    e.isAllDay || !e.startsAt ? 'All day' : format(toZonedTime(e.startsAt, timeZone), 'HH:mm');
  const todayCount = events.length + dueToday.length + habits.length;

  return (
    <Card className="lg:col-span-12" data-slot="today-block">
      <CardContent className="flex flex-col gap-5">
        <Section
          title="Today"
          icon={ListChecksIcon}
          count={todayCount}
          aside={
            <Link
              href={`/calendar?date=${todayKey}`}
              className={cn(buttonVariants({ variant: 'ghost', size: 'xs' }))}
            >
              Open the day
            </Link>
          }
        >
          {todayCount === 0 ? (
            <Quiet>Nothing due today. Pick something from this week or from To schedule.</Quiet>
          ) : (
            <ul className="flex flex-col">
              {events.map((e) => (
                <li key={e.id} className="flex items-center gap-2.5 px-1.5 py-1 text-sm">
                  <span className="text-muted-foreground w-12 shrink-0 text-xs tabular-nums">
                    {timeOf(e)}
                  </span>
                  <SegmentDot accent={e.calendar.accent} />
                  <Link
                    href={`/calendar?date=${todayKey}`}
                    className="min-w-0 flex-1 truncate hover:underline"
                  >
                    {e.title}
                  </Link>
                </li>
              ))}
              {dueToday.map((t) => (
                <li key={t.id}>
                  <TaskRow task={t} status={t.due} editHref={editHref(t.id)} compact />
                </li>
              ))}
              {habits.map((h) => (
                <li key={h.id} className="flex items-center gap-2.5 px-1.5 py-1 text-sm">
                  <HabitToggle
                    key={`${h.id}:${todayKey}`}
                    habitId={h.id}
                    dateKey={todayKey}
                    done={false}
                    label={`Check in ${h.name}`}
                  />
                  <SegmentDot accent={habitAccent(h)} />
                  <Link href="/habits" className="min-w-0 flex-1 truncate hover:underline">
                    {h.name}
                  </Link>
                  <span className="text-muted-foreground text-xs">Habit</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Overdue" icon={TriangleAlertIcon} count={overdue.length}>
          {overdue.length === 0 ? (
            <Quiet>Nothing overdue.</Quiet>
          ) : (
            <ul className="flex flex-col">
              {overdue.map((t) => (
                <li key={t.id}>
                  <TaskRow task={t} status={t.due} editHref={editHref(t.id)} compact />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="To schedule"
          icon={CalendarClockIcon}
          count={undatedCount}
          aside={
            undatedCount > 0 ? (
              <Link
                href="/tasks?due=none"
                className={cn(buttonVariants({ variant: 'ghost', size: 'xs' }))}
              >
                All {undatedCount} without a date
              </Link>
            ) : undefined
          }
        >
          {undated.length === 0 ? (
            <Quiet>Every open task has a date.</Quiet>
          ) : (
            <ul className="flex flex-col">
              {undated.map((t) => (
                <li key={t.id}>
                  <TaskRow task={t} status={t.due} editHref={editHref(t.id)} compact />
                </li>
              ))}
            </ul>
          )}
        </Section>
      </CardContent>
    </Card>
  );
}
