import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { HourglassIcon } from 'lucide-react';
import { ProgressBar } from '@/components/shared/progress-bar';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { toDateKey, weekRange, type WeekStartsOn } from '@/lib/dates';
import { expectedWeeklyHours, formatHours, nextShift, summariseWeekHours } from '../hours';
import { listPatterns, listWorkDays } from '../queries';
import { SHIFT_KIND_LABELS } from '../schema';
import { shiftTimeLabel } from './status';

/** This week's shift hours, worked and still to come, against the pattern's weekly total. */
export async function WorkHoursDashboardCard({
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
  const today = parseISO(todayKey);
  const week = weekRange(today, weekStartsOn);
  const [days, patterns] = await Promise.all([
    listWorkDays(userId, toDateKey(week.start), toDateKey(week.end)),
    listPatterns(userId),
  ]);
  const totals = summariseWeekHours(days, todayKey);
  const expected = expectedWeeklyHours(patterns);
  const total = totals.worked + totals.planned;
  // Only the clock time comes from now; the date is the user's today.
  const next = nextShift(days, todayKey, formatInTimeZone(new Date(), timeZone, 'HH:mm'));
  const nextDay = next
    ? next.date === todayKey
      ? 'Today'
      : format(parseISO(next.date), 'EEEE')
    : null;
  const nextTime = next ? shiftTimeLabel(next.shift) : null;
  const nextKind =
    next && next.shift.kind === 'on_call'
      ? `${next.shift.label} (${SHIFT_KIND_LABELS.on_call.toLowerCase()})`
      : next?.shift.label;

  return (
    <DashboardCard title="Hours this week" icon={HourglassIcon} href="/work/calendar" release={6}>
      {totals.shifts === 0 && !next ? (
        <EmptyNote>
          No shifts this week.{' '}
          <Link href="/work/calendar" className="text-primary link">
            Open the job calendar.
          </Link>
        </EmptyNote>
      ) : (
        <>
          <p className="text-sm">
            <span className="font-heading text-2xl leading-none">{formatHours(totals.worked)}</span>{' '}
            <span className="text-muted-foreground">
              hours worked so far
              {totals.planned > 0 && `, ${formatHours(totals.planned)} still to come`}.
            </span>
          </p>
          <ProgressBar
            value={
              expected
                ? Math.min(100, Math.round((total / expected) * 100))
                : total > 0
                  ? Math.round((totals.worked / total) * 100)
                  : 0
            }
            label={expected ? 'Against the pattern' : 'Worked of planned'}
            valueText={
              expected
                ? `${formatHours(total)} of ${formatHours(expected)} h`
                : `${formatHours(totals.worked)} of ${formatHours(total)} h`
            }
          />
          <p className="text-muted-foreground text-xs">
            {next
              ? `Next shift ${nextDay}: ${nextKind}${nextTime ? ` ${nextTime}` : ''}.`
              : 'No more shifts this week.'}
            {totals.untimed > 0 &&
              ` ${totals.untimed} shift${totals.untimed === 1 ? ' has' : 's have'} no times and ${totals.untimed === 1 ? 'is' : 'are'} not counted.`}
          </p>
        </>
      )}
    </DashboardCard>
  );
}
