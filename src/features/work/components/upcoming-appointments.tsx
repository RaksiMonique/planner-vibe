import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { PlusIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader } from '@/components/ui/card';
import { SegmentDot } from '@/components/shared/segment-badge';
import type { CalendarItem } from '@/features/calendar/expand';
import { EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { cn } from '@/lib/utils';

/** Events on the work calendar for the next fortnight; new ones are made on the Life Calendar. */
export function UpcomingAppointments({
  items,
  timeZone,
}: {
  items: CalendarItem[];
  timeZone: string;
}) {
  return (
    <Card size="sm">
      <CardHeader className="items-center">
        <h3 className="font-heading text-lg">Work appointments</h3>
        <CardAction>
          <Link
            href="/calendar?new=1"
            className={cn(buttonVariants({ variant: 'outline', size: 'xs' }))}
          >
            <PlusIcon data-icon="inline-start" />
            Add appointment
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyNote>
            Nothing on the work calendar in the next two weeks. Events you add to the Work calendar
            appear here.
          </EmptyNote>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                <SegmentDot accent={item.accent} />
                <span className="text-muted-foreground w-14 shrink-0 text-xs">
                  {item.allDay
                    ? format(parseISO(item.start), 'EEE d')
                    : formatInTimeZone(new Date(item.start), timeZone, 'EEE d')}
                </span>
                <Link
                  href={`/calendar?date=${item.allDay ? item.start : formatInTimeZone(new Date(item.start), timeZone, 'yyyy-MM-dd')}`}
                  className="min-w-0 flex-1 truncate hover:underline"
                >
                  {item.title}
                </Link>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {item.allDay
                    ? 'All day'
                    : formatInTimeZone(new Date(item.start), timeZone, 'HH:mm')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
