import type { Metadata } from 'next';
import { addDays, endOfMonth, endOfWeek, format, isValid, parseISO, startOfWeek } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { CalendarPlusIcon, PlusIcon, TreePalmIcon } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { getPreferences } from '@/features/settings/service';
import { AvailabilityStrip } from '@/features/work/components/availability-strip';
import { HolidaysPanel } from '@/features/work/components/holidays-panel';
import { LeaveFormDialog } from '@/features/work/components/leave-form-dialog';
import { LeavePanel } from '@/features/work/components/leave-panel';
import { PatternFormDialog } from '@/features/work/components/pattern-form-dialog';
import { PatternsPanel } from '@/features/work/components/patterns-panel';
import { ShiftFormDialog } from '@/features/work/components/shift-form-dialog';
import { ShiftsPanel } from '@/features/work/components/shifts-panel';
import { UpcomingAppointments } from '@/features/work/components/upcoming-appointments';
import { WorkMonthGrid } from '@/features/work/components/work-month-grid';
import {
  listHolidays,
  listLeavePeriods,
  listPatterns,
  listShiftsBetween,
  listUpcomingWorkAppointments,
  listWorkDays,
} from '@/features/work/queries';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone } from '@/lib/dates';

export const metadata: Metadata = { title: 'Job calendar' };
export const dynamic = 'force-dynamic';

export default async function JobCalendarPage({ searchParams }: PageProps<'/work/calendar'>) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const prefs = await getPreferences(user.id);
  const today = todayInZone(prefs.timeZone);
  const todayKey = toDateKey(today);

  const requested = typeof params.month === 'string' ? params.month : '';
  const monthKey =
    /^\d{4}-\d{2}$/.test(requested) && isValid(parseISO(`${requested}-01`))
      ? requested
      : todayKey.slice(0, 7);
  const first = parseISO(`${monthKey}-01`);
  const monthStart = `${monthKey}-01`;
  const monthEnd = toDateKey(endOfMonth(first));
  const gridFrom = toDateKey(startOfWeek(first, { weekStartsOn: prefs.weekStartsOn }));
  const gridTo = toDateKey(endOfWeek(endOfMonth(first), { weekStartsOn: prefs.weekStartsOn }));
  const stripTo = toDateKey(addDays(today, 13));
  const appointmentsFrom = fromZonedTime(`${todayKey}T00:00:00`, prefs.timeZone);
  const appointmentsTo = fromZonedTime(`${toDateKey(addDays(today, 14))}T00:00:00`, prefs.timeZone);

  const [gridDays, stripDays, patterns, manualShifts, leave, holidays, appointments] =
    await Promise.all([
      listWorkDays(user.id, gridFrom, gridTo),
      listWorkDays(user.id, todayKey, stripTo),
      listPatterns(user.id, { includeInactive: true }),
      listShiftsBetween(user.id, monthStart, monthEnd),
      listLeavePeriods(user.id, { from: todayKey }),
      listHolidays(user.id, { from: todayKey }),
      listUpcomingWorkAppointments(user.id, appointmentsFrom, appointmentsTo),
    ]);
  const defaultDate = monthKey === todayKey.slice(0, 7) ? todayKey : monthStart;

  return (
    <>
      <PageHeader
        eyebrow="Work"
        title="Job calendar"
        description="Shift patterns repeat on their own; add one-off or repeating shifts, leave and public holidays and the calendar works out when you are free."
        actions={
          <>
            <ShiftFormDialog
              defaultDate={defaultDate}
              variant="outline"
              trigger={
                <>
                  <CalendarPlusIcon data-icon="inline-start" />
                  Add shift
                </>
              }
            />
            <LeaveFormDialog
              defaultDate={defaultDate}
              variant="outline"
              trigger={
                <>
                  <TreePalmIcon data-icon="inline-start" />
                  Add leave
                </>
              }
            />
            <PatternFormDialog
              defaultAnchorDate={todayKey}
              trigger={
                <>
                  <PlusIcon data-icon="inline-start" />
                  New pattern
                </>
              }
            />
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <AvailabilityStrip days={stripDays} todayKey={todayKey} />
          <WorkMonthGrid days={gridDays} monthKey={monthKey} todayKey={todayKey} />
        </div>
        <aside className="flex min-w-0 flex-col gap-4">
          <PatternsPanel patterns={patterns} todayKey={todayKey} />
          <ShiftsPanel
            shifts={manualShifts}
            monthLabel={format(first, 'MMMM')}
            defaultDate={defaultDate}
            from={monthStart}
            to={monthEnd}
          />
          <LeavePanel leave={leave} defaultDate={defaultDate} />
          <HolidaysPanel holidays={holidays} defaultDate={defaultDate} />
          <UpcomingAppointments items={appointments} timeZone={prefs.timeZone} />
        </aside>
      </div>
    </>
  );
}
