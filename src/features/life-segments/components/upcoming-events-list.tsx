import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { CalendarDaysIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import type { CalendarItem } from '@/features/calendar/expand';
import { cn } from '@/lib/utils';

/** The segment's events over the next fortnight, soonest first. */
export function UpcomingEventsList({
  items,
  timeZone,
  allHref,
  limit = 8,
}: {
  items: CalendarItem[];
  timeZone: string;
  allHref: string;
  limit?: number;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={CalendarDaysIcon}
        title="Nothing scheduled"
        description="Events in this segment over the next 14 days appear here."
      />
    );
  }
  const shown = items.slice(0, limit);
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1.5">
        {shown.map((item) => {
          const dayKey = item.allDay
            ? item.start
            : formatInTimeZone(new Date(item.start), timeZone, 'yyyy-MM-dd');
          const when = item.allDay
            ? `${format(parseISO(item.start), 'EEE d MMM')} · All day`
            : `${formatInTimeZone(new Date(item.start), timeZone, 'EEE d MMM · HH:mm')}${
                item.end ? `–${formatInTimeZone(new Date(item.end), timeZone, 'HH:mm')}` : ''
              }`;
          return (
            <li
              key={item.id}
              className="bg-card flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-2.5 py-2"
            >
              <Link
                href={`/calendar?date=${dayKey}`}
                className="link min-w-0 flex-1 truncate text-sm"
              >
                {item.title}
              </Link>
              <span className="text-muted-foreground text-xs tabular-nums">{when}</span>
            </li>
          );
        })}
      </ul>
      <Link
        href={allHref}
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'self-start')}
      >
        All on the calendar
      </Link>
    </div>
  );
}
