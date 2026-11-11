import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { CalendarDaysIcon, ListChecksIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { daysFromToday } from '../summary';

export type UpcomingTask = { id: string; title: string; dueDate: string };
export type UpcomingEvent = {
  id: string;
  title: string;
  /** yyyy-MM-dd in the user's zone. */
  dateKey: string;
  /** HH:mm, or null for an all-day event. */
  time: string | null;
};

function dueLabel(dateKey: string, todayKey: string): { text: string; overdue: boolean } {
  const days = daysFromToday(dateKey, todayKey);
  if (days < 0) return { text: `${-days} day${days === -1 ? '' : 's'} overdue`, overdue: true };
  if (days === 0) return { text: 'Due today', overdue: false };
  if (days === 1) return { text: 'Due tomorrow', overdue: false };
  return { text: `Due in ${days} days`, overdue: false };
}

/** Tasks and events in the Finance segment for the next 30 days, each linking to where it is managed. */
export function UpcomingActions({
  tasks,
  events,
  todayKey,
}: {
  tasks: UpcomingTask[];
  events: UpcomingEvent[];
  todayKey: string;
}) {
  if (tasks.length === 0 && events.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Nothing due in the next 30 days. Financial tasks and events show here when they sit in your
        Finance segment.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {tasks.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h3 className="text-muted-foreground tracking-eyebrow font-sans text-[11px] uppercase">
            Tasks
          </h3>
          <ul className="flex flex-col gap-1">
            {tasks.map((t) => {
              const due = dueLabel(t.dueDate, todayKey);
              return (
                <li key={t.id}>
                  <Link
                    href={`/tasks?task=${t.id}`}
                    className="hover:bg-muted/50 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm"
                  >
                    <ListChecksIcon className="text-primary size-4 shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{t.title}</span>
                    <span
                      className={cn(
                        'shrink-0 text-xs',
                        due.overdue ? 'text-destructive' : 'text-muted-foreground'
                      )}
                    >
                      {due.text}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {events.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h3 className="text-muted-foreground tracking-eyebrow font-sans text-[11px] uppercase">
            Events
          </h3>
          <ul className="flex flex-col gap-1">
            {events.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/calendar?date=${e.dateKey}`}
                  className="hover:bg-muted/50 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm"
                >
                  <CalendarDaysIcon className="text-primary size-4 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{e.title}</span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {format(parseISO(e.dateKey), 'EEE d MMM')}
                    {e.time ? ` · ${e.time}` : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
