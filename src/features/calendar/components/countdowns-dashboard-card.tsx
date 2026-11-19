import Link from 'next/link';
import { addDays, format, parseISO } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { CalendarClockIcon } from 'lucide-react';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { listGoals, listMilestones } from '@/features/goals/queries';
import { toDateKey, type WeekStartsOn } from '@/lib/dates';
import { daysUntil, daysUntilWording } from '../countdown';
import { expandEvents } from '../expand';
import { listEventsBetween } from '../queries';

const PREVIEW = 6;
const HORIZON_DAYS = 90;

type Countdown = {
  id: string;
  title: string;
  dateKey: string;
  kind: 'Event' | 'Milestone' | 'Goal';
  href: string;
};

/** The next dated things in the coming three months: all-day events, milestones and goal targets. */
export async function CountdownsDashboardCard({
  userId,
  todayKey,
  timeZone,
}: {
  userId: string;
  todayKey: string;
  timeZone: string;
  weekStartsOn: WeekStartsOn;
}) {
  const endKey = toDateKey(addDays(parseISO(todayKey), HORIZON_DAYS));
  const from = fromZonedTime(`${todayKey}T00:00:00`, timeZone);
  const to = fromZonedTime(`${toDateKey(addDays(parseISO(endKey), 1))}T00:00:00`, timeZone);
  const [eventRows, milestones, goals] = await Promise.all([
    listEventsBetween(userId, from, to),
    listMilestones(userId, { dueFrom: todayKey, dueTo: endKey, open: true }),
    listGoals(userId),
  ]);

  const dayOf = (iso: string) => formatInTimeZone(new Date(iso), timeZone, 'yyyy-MM-dd');
  const items: Countdown[] = [];
  for (const e of expandEvents(eventRows, from, to)) {
    // All-day events and timed ones that run past midnight; ordinary appointments stay on the calendar.
    const startKey = e.allDay ? e.start : dayOf(e.start);
    const multiDay = !e.allDay && e.end !== null && dayOf(e.end) !== startKey;
    if (!e.allDay && !multiDay) continue;
    if (startKey < todayKey || startKey > endKey) continue;
    items.push({
      id: e.id,
      title: e.title,
      dateKey: startKey,
      kind: 'Event',
      href: `/calendar?date=${startKey}`,
    });
  }
  for (const m of milestones) {
    if (!m.dueDate) continue;
    items.push({
      id: `milestone:${m.id}`,
      title: m.title,
      dateKey: m.dueDate,
      kind: 'Milestone',
      href: m.goalId ? `/goals/${m.goalId}` : `/projects/${m.projectId}`,
    });
  }
  for (const g of goals) {
    if (!g.targetDate || g.targetDate < todayKey || g.targetDate > endKey) continue;
    items.push({
      id: `goal:${g.id}`,
      title: g.title,
      dateKey: g.targetDate,
      kind: 'Goal',
      href: `/goals/${g.id}`,
    });
  }
  items.sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.title.localeCompare(b.title));
  const shown = items.slice(0, PREVIEW);
  const more = items.length - shown.length;

  return (
    <DashboardCard title="Coming up" icon={CalendarClockIcon} href="/calendar" release={6}>
      {items.length === 0 ? (
        <EmptyNote>
          Nothing dated in the next three months.{' '}
          <Link href="/calendar" className="text-primary link">
            Add an event.
          </Link>
        </EmptyNote>
      ) : (
        <>
          <ul className="flex flex-col gap-1.5">
            {shown.map((item) => {
              const days = daysUntil(todayKey, item.dateKey);
              return (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-11 shrink-0 text-xs tabular-nums">
                    {format(parseISO(item.dateKey), 'd MMM')}
                  </span>
                  <Link href={item.href} className="link min-w-0 flex-1 truncate">
                    {item.title}
                  </Link>
                  <span className="text-muted-foreground hidden text-xs sm:inline">
                    {item.kind}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {daysUntilWording(days)}
                  </span>
                </li>
              );
            })}
          </ul>
          {more > 0 && (
            <Link href="/calendar" className="text-primary link text-xs">
              {more} more on the Calendar page
            </Link>
          )}
        </>
      )}
    </DashboardCard>
  );
}
