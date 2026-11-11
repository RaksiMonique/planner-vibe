import { format, parseISO } from 'date-fns';
import { BriefcaseIcon } from 'lucide-react';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { cn } from '@/lib/utils';
import { WORK_STATUS_LABELS, type WorkDay } from '../availability';
import { STATUS_CLASSES, shiftTimeLabel } from './status';

/**
 * Dashboard preview of the week ahead. `days` is today plus the next six, as
 * returned by `listWorkDays(userId, today, today + 6)`.
 */
export function JobScheduleCard({ days }: { days: WorkDay[] }) {
  const today = days[0];
  const working = days.filter((d) => d.status === 'working' || d.status === 'on_call').length;
  const nextFree = days.find((d, i) => i > 0 && d.status !== 'working' && d.status !== 'on_call');
  const todayShifts = today?.shifts.filter((s) => s.kind !== 'off') ?? [];

  return (
    <DashboardCard title="Job schedule" icon={BriefcaseIcon} href="/work/calendar" release={5}>
      {days.length === 0 ? (
        <EmptyNote>Add a shift pattern to see the week ahead.</EmptyNote>
      ) : (
        <>
          <p className="text-sm">
            {today.status === 'working' || today.status === 'on_call' ? (
              <>
                Today:{' '}
                {todayShifts
                  .map((s) => {
                    const time = shiftTimeLabel(s);
                    return time ? `${s.label} ${time}` : s.label;
                  })
                  .join(', ')}
              </>
            ) : (
              <>
                Today: {WORK_STATUS_LABELS[today.status].toLowerCase()}
                {today.holiday && ` (${today.holiday.name})`}
              </>
            )}
          </p>
          <ol className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              const date = parseISO(day.date);
              const first = day.shifts.find((s) => s.kind !== 'off');
              return (
                <li
                  key={day.date}
                  data-status={day.status}
                  title={`${format(date, 'EEEE d MMMM')}: ${WORK_STATUS_LABELS[day.status]}${first ? `, ${first.label}` : ''}`}
                  className={cn(
                    'flex flex-col items-center gap-0.5 rounded-md border px-0.5 py-1.5 text-center',
                    STATUS_CLASSES[day.status],
                    i === 0 && 'ring-primary ring-2'
                  )}
                >
                  <span className="text-[10px] leading-none uppercase opacity-80">
                    {format(date, 'EEEEE')}
                  </span>
                  <span className="text-sm leading-none font-medium tabular-nums">
                    {format(date, 'd')}
                  </span>
                  <span className="w-full truncate text-[10px] leading-tight">
                    {first ? first.label : WORK_STATUS_LABELS[day.status]}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="text-muted-foreground text-xs">
            {working} of the next {days.length} days at work
            {nextFree && `; next day off ${format(parseISO(nextFree.date), 'EEEE')}`}.
          </p>
        </>
      )}
    </DashboardCard>
  );
}
