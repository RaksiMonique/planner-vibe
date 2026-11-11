import { format, parseISO } from 'date-fns';
import { Card, CardAction, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { WORK_STATUS_LABELS, type WorkDay } from '../availability';
import { STATUS_CLASSES, shiftTimeLabel } from './status';

/** The next fortnight at a glance: free, working, on call, leave or holiday per day. */
export function AvailabilityStrip({ days, todayKey }: { days: WorkDay[]; todayKey: string }) {
  const free = days.filter((d) => d.status === 'off').length;
  return (
    <Card size="sm">
      <CardHeader className="items-center">
        <h3 className="font-heading text-lg">Next 14 days</h3>
        <CardAction>
          <p className="text-muted-foreground text-xs">
            {free} free day{free === 1 ? '' : 's'}
          </p>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ol className="grid grid-cols-7 gap-1 md:grid-cols-14">
          {days.map((day) => {
            const date = parseISO(day.date);
            const first = day.shifts.find((s) => s.kind !== 'off');
            const time = first ? shiftTimeLabel(first) : null;
            return (
              <li
                key={day.date}
                data-date={day.date}
                data-status={day.status}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-md border px-0.5 py-1.5 text-center',
                  STATUS_CLASSES[day.status],
                  day.date === todayKey && 'ring-primary ring-2'
                )}
              >
                <span className="text-[10px] leading-none uppercase opacity-80">
                  {format(date, 'EEEEE')}
                </span>
                <span className="text-sm leading-none font-medium tabular-nums">
                  {format(date, 'd')}
                </span>
                <span className="w-full truncate text-[10px] leading-tight">
                  {WORK_STATUS_LABELS[day.status]}
                </span>
                {time && (
                  <span className="hidden w-full truncate text-[10px] leading-tight opacity-80 xl:block">
                    {time}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
