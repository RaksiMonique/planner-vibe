import 'server-only';
import { and, asc, desc, eq, gt, gte, isNull, lte, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { leavePeriods, publicHolidays, shiftKinds, shiftPatterns, shifts } from '@/db/schema';
import { expandEvents, type CalendarItem } from '@/features/calendar/expand';
import { listEventsBetween } from '@/features/calendar/queries';
import { listSegments, type LifeSegment } from '@/features/life-segments/service';
import type { Accent } from '@/lib/accents';
import { ValidationError } from '@/lib/errors';
import { toDateKey } from '@/lib/dates';
import { deriveWorkDays, shiftCalendarItems, type WorkDay } from './availability';

export type ShiftPattern = typeof shiftPatterns.$inferSelect;
export type Shift = typeof shifts.$inferSelect;
export type ShiftKindRow = typeof shiftKinds.$inferSelect;
/** A shift with the name and colour of its own kind, when it has one. */
export type ShiftRow = Shift & { kindName: string | null; kindAccent: Accent | null };
export type LeavePeriod = typeof leavePeriods.$inferSelect;
export type PublicHoliday = typeof publicHolidays.$inferSelect;

/**
 * Every work record belongs to the user's work segment: the one with slug
 * `career-work`, else the first whose name mentions work, career or a job,
 * else the user's first segment.
 */
export async function getWorkSegment(userId: string): Promise<LifeSegment> {
  const segments = await listSegments(userId);
  const segment =
    segments.find((s) => s.slug === 'career-work') ??
    segments.find((s) => /work|career|job/i.test(s.name)) ??
    segments[0];
  if (!segment) throw new ValidationError('Create a Life Segment before planning work.');
  return segment;
}

export async function listPatterns(
  userId: string,
  opts: { includeInactive?: boolean } = {}
): Promise<ShiftPattern[]> {
  const conds = [eq(shiftPatterns.userId, userId), isNull(shiftPatterns.deletedAt)];
  if (!opts.includeInactive) conds.push(eq(shiftPatterns.isActive, true));
  return db
    .select()
    .from(shiftPatterns)
    .where(and(...conds))
    .orderBy(desc(shiftPatterns.isActive), asc(shiftPatterns.name));
}

/**
 * Manual shift rows with a day inside [from, to] (inclusive 'yyyy-MM-dd'
 * keys): a block that overlaps it, or a repeating one that has not ended
 * before it. `expandShift` turns each into its dates.
 */
export async function listShiftsBetween(
  userId: string,
  from: string,
  to: string
): Promise<ShiftRow[]> {
  const rows = await db
    .select({ shift: shifts, kindName: shiftKinds.name, kindAccent: shiftKinds.accent })
    .from(shifts)
    .leftJoin(shiftKinds, eq(shiftKinds.id, shifts.kindId))
    .where(
      and(
        eq(shifts.userId, userId),
        lte(shifts.date, to),
        or(
          and(
            eq(shifts.repeatEvery, 0),
            gte(sql`coalesce(${shifts.endDate}, ${shifts.date})`, from)
          ),
          and(
            gt(shifts.repeatEvery, 0),
            or(isNull(shifts.repeatUntil), gte(shifts.repeatUntil, from))
          )
        )
      )
    )
    .orderBy(asc(shifts.date), asc(shifts.startTime), asc(shifts.createdAt));
  return rows.map((r) => ({ ...r.shift, kindName: r.kindName, kindAccent: r.kindAccent }));
}

/** The user's own shift kinds, by name. */
export async function listShiftKinds(userId: string): Promise<ShiftKindRow[]> {
  return db
    .select()
    .from(shiftKinds)
    .where(eq(shiftKinds.userId, userId))
    .orderBy(asc(shiftKinds.name));
}

/** Leave periods overlapping [from, to]. */
export async function listLeaveBetween(
  userId: string,
  from: string,
  to: string
): Promise<LeavePeriod[]> {
  return db
    .select()
    .from(leavePeriods)
    .where(
      and(
        eq(leavePeriods.userId, userId),
        isNull(leavePeriods.deletedAt),
        lte(leavePeriods.startDate, to),
        gte(leavePeriods.endDate, from)
      )
    )
    .orderBy(asc(leavePeriods.startDate));
}

/** Leave periods that end on or after `from` (current and upcoming), oldest first. */
export async function listLeavePeriods(userId: string, opts: { from?: string } = {}) {
  const conds = [eq(leavePeriods.userId, userId), isNull(leavePeriods.deletedAt)];
  if (opts.from) conds.push(gte(leavePeriods.endDate, opts.from));
  return db
    .select()
    .from(leavePeriods)
    .where(and(...conds))
    .orderBy(asc(leavePeriods.startDate))
    .limit(50);
}

export async function listHolidaysBetween(
  userId: string,
  from: string,
  to: string
): Promise<PublicHoliday[]> {
  return db
    .select()
    .from(publicHolidays)
    .where(
      and(
        eq(publicHolidays.userId, userId),
        gte(publicHolidays.date, from),
        lte(publicHolidays.date, to)
      )
    )
    .orderBy(asc(publicHolidays.date));
}

/** Public holidays on or after `from`, soonest first. */
export async function listHolidays(userId: string, opts: { from?: string } = {}) {
  const conds = [eq(publicHolidays.userId, userId)];
  if (opts.from) conds.push(gte(publicHolidays.date, opts.from));
  return db
    .select()
    .from(publicHolidays)
    .where(and(...conds))
    .orderBy(asc(publicHolidays.date))
    .limit(60);
}

/** Derived availability for every date in [from, to] ('yyyy-MM-dd', inclusive). */
export async function listWorkDays(userId: string, from: string, to: string): Promise<WorkDay[]> {
  const [patterns, manual, leave, holidays] = await Promise.all([
    listPatterns(userId),
    listShiftsBetween(userId, from, to),
    listLeaveBetween(userId, from, to),
    listHolidaysBetween(userId, from, to),
  ]);
  return deriveWorkDays({ patterns, shifts: manual, leave, holidays }, from, to);
}

/** Events on calendars of kind `work` inside [from, to), recurring ones expanded, soonest first. */
export async function listUpcomingWorkAppointments(
  userId: string,
  from: Date,
  to: Date
): Promise<CalendarItem[]> {
  const rows = await listEventsBetween(userId, from, to);
  const work = rows.filter((r) => r.calendar.kind === 'work');
  return expandEvents(work, from, to).sort((a, b) => a.start.localeCompare(b.start));
}

/** Shifts for the Life Calendar: read-only items for every working or on-call day in [from, to). */
export async function listShiftCalendarItems(
  userId: string,
  from: Date,
  to: Date,
  timeZone: string
): Promise<CalendarItem[]> {
  const [days, segment] = await Promise.all([
    listWorkDays(userId, toDateKey(from), toDateKey(to)),
    getWorkSegment(userId).catch(() => null),
  ]);
  return shiftCalendarItems(days, timeZone, segment?.id ?? null);
}
