import type { Metadata } from 'next';
import { and, eq, isNull } from 'drizzle-orm';
import { addDays, endOfMonth, isValid, parseISO, startOfMonth } from 'date-fns';
import { db } from '@/db';
import { captures } from '@/db/schema';
import { PageHeader } from '@/components/shared/page-header';
import { CalendarPage } from '@/features/calendar/components/calendar-page';
import { listCalendars } from '@/features/calendar/queries';
import { buildCalendarItems } from '@/features/calendar/service';
import { listSegments } from '@/features/life-segments/service';
import { getPreferences } from '@/features/settings/service';
import { requireUser } from '@/lib/auth';
import { todayInZone } from '@/lib/dates';

export const metadata: Metadata = { title: 'Calendar' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CalendarRoute({ searchParams }: { searchParams: SearchParams }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const [prefs, segments, calendars] = await Promise.all([
    getPreferences(user.id),
    listSegments(user.id),
    listCalendars(user.id),
  ]);

  // `?date=` opens the calendar on that day (dashboard and notification links).
  const today = todayInZone(prefs.timeZone);
  const requested = typeof params.date === 'string' ? parseISO(params.date) : null;
  const anchor = requested && isValid(requested) ? requested : today;
  const initialDate = requested && isValid(requested) ? params.date : undefined;
  // Generous first window so the month view (up to six weeks) needs no extra fetch.
  const from = addDays(startOfMonth(anchor), -7);
  const to = addDays(endOfMonth(anchor), 14);
  const items = await buildCalendarItems(user.id, from, to);

  const captureId = typeof params.capture === 'string' ? params.capture : null;
  let capture: { id: string; text: string } | null = null;
  if (captureId) {
    const [row] = await db
      .select({ id: captures.id, text: captures.text })
      .from(captures)
      .where(
        and(eq(captures.userId, user.id), eq(captures.id, captureId), isNull(captures.convertedAt))
      )
      .limit(1);
    capture = row ?? null;
  }

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Events, task due dates and milestones in one place. Drag to reschedule, click a day to add."
      />
      <CalendarPage
        calendars={calendars.map((c) => ({
          id: c.id,
          name: c.name,
          accent: c.accent,
          isEnabled: c.isEnabled,
        }))}
        segments={segments.map((s) => ({ id: s.id, name: s.name, accent: s.accent }))}
        initialRange={{ from: from.toISOString(), to: to.toISOString(), items }}
        weekStartsOn={prefs.weekStartsOn}
        openNew={params.new === '1'}
        capture={capture}
        initialDate={initialDate as string | undefined}
      />
    </>
  );
}
