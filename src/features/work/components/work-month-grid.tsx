import Link from 'next/link';
import { addMonths, format, parseISO, subMonths } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { WORK_STATUS_LABELS, type WorkDay, type WorkDayStatus } from '../availability';
import { buildWorkCalendarHref } from '../hrefs';
import { LEAVE_KIND_LABELS } from '../schema';
import { STATUS_CLASSES, STATUS_DOT, shiftChipClass, shiftTimeLabel } from './status';

const LEGEND: WorkDayStatus[] = ['working', 'on_call', 'off', 'leave', 'holiday'];

/** The month, padded to whole weeks, one derived day per cell. */
export function WorkMonthGrid({
  days,
  monthKey,
  todayKey,
}: {
  /** Derived days for the padded grid range, in order. */
  days: WorkDay[];
  /** yyyy-MM */
  monthKey: string;
  todayKey: string;
}) {
  const first = parseISO(`${monthKey}-01`);
  const headers = days.slice(0, 7).map((d) => format(parseISO(d.date), 'EEEEE'));
  const headersLong = days.slice(0, 7).map((d) => format(parseISO(d.date), 'EEE'));
  const navClass = cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }));
  const inMonth = days.filter((d) => d.date.startsWith(monthKey));
  const working = inMonth.filter((d) => d.status === 'working').length;
  const onCall = inMonth.filter((d) => d.status === 'on_call').length;

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center gap-2">
        <Link
          href={buildWorkCalendarHref({ month: format(subMonths(first, 1), 'yyyy-MM') })}
          className={navClass}
          aria-label="Previous month"
        >
          <ChevronLeftIcon />
        </Link>
        <Link
          href={buildWorkCalendarHref({ month: format(addMonths(first, 1), 'yyyy-MM') })}
          className={navClass}
          aria-label="Next month"
        >
          <ChevronRightIcon />
        </Link>
        <h3 className="font-heading min-w-28 text-lg">{format(first, 'MMMM yyyy')}</h3>
        <p className="text-muted-foreground ml-auto text-xs">
          {working} working day{working === 1 ? '' : 's'}
          {onCall > 0 && `, ${onCall} on call`}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-7 gap-1">
          {headers.map((h, i) => (
            <div
              key={h + i}
              className="text-muted-foreground text-center text-[11px] font-medium uppercase"
            >
              <span className="sm:hidden">{h}</span>
              <span className="hidden sm:inline">{headersLong[i]}</span>
            </div>
          ))}
        </div>
        <ol className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const date = parseISO(day.date);
            const outside = !day.date.startsWith(monthKey);
            const isToday = day.date === todayKey;
            const summary = [
              WORK_STATUS_LABELS[day.status],
              ...day.shifts.map((s) => s.label),
              day.holiday?.name,
            ]
              .filter(Boolean)
              .join(', ');
            return (
              <li
                key={day.date}
                data-date={day.date}
                data-status={day.status}
                aria-label={`${format(date, 'EEEE d MMMM yyyy')}: ${summary}`}
                className={cn(
                  'flex min-h-16 flex-col gap-0.5 rounded-md border p-1 text-left sm:min-h-24 sm:p-1.5',
                  STATUS_CLASSES[day.status],
                  outside && 'opacity-45',
                  isToday && 'ring-primary ring-2'
                )}
              >
                <span
                  className={cn(
                    'text-[11px] leading-none tabular-nums sm:text-xs',
                    isToday ? 'text-primary font-semibold' : 'font-medium'
                  )}
                >
                  {format(date, 'd')}
                </span>
                {day.holiday && (
                  <span className="truncate text-[10px] leading-tight sm:text-[11px]">
                    {day.holiday.name}
                  </span>
                )}
                {day.leave && (
                  <span className="truncate text-[10px] leading-tight sm:text-[11px]">
                    {LEAVE_KIND_LABELS[day.leave.kind]}
                  </span>
                )}
                {day.shifts.map((shift, i) => {
                  const time = shiftTimeLabel(shift);
                  return (
                    <span
                      key={i}
                      className={cn(
                        'truncate rounded px-1 text-[10px] leading-4 sm:text-[11px]',
                        shiftChipClass(shift)
                      )}
                      title={time ? `${shift.label} ${time}` : shift.label}
                    >
                      {shift.label}
                      {time && <span className="hidden opacity-80 lg:inline"> {time}</span>}
                    </span>
                  );
                })}
              </li>
            );
          })}
        </ol>
        <ul
          className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-xs"
          aria-label="Legend"
        >
          {LEGEND.map((status) => (
            <li key={status} className="flex items-center gap-1.5">
              <span className={cn('size-2.5 rounded-full', STATUS_DOT[status])} aria-hidden />
              {WORK_STATUS_LABELS[status]}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
