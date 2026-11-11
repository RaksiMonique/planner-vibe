import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { leavePeriods, publicHolidays, shiftPatterns, shifts } from '@/db/schema';
import { NotFoundError } from '@/lib/errors';
import {
  getWorkSegment,
  type LeavePeriod,
  type PublicHoliday,
  type Shift,
  type ShiftPattern,
} from './queries';
import type { HolidayInput, LeaveInput, PatternInput, ShiftInput } from './schema';

// Shift patterns

export async function getPatternOrThrow(userId: string, id: string): Promise<ShiftPattern> {
  const [row] = await db
    .select()
    .from(shiftPatterns)
    .where(
      and(
        eq(shiftPatterns.userId, userId),
        eq(shiftPatterns.id, id),
        isNull(shiftPatterns.deletedAt)
      )
    )
    .limit(1);
  if (!row) throw new NotFoundError('That shift pattern does not exist.');
  return row;
}

function patternValues(input: PatternInput) {
  return {
    name: input.name,
    anchorDate: input.anchorDate,
    cycle: input.cycle.map((d) => ({
      kind: d.kind,
      ...(d.label ? { label: d.label } : {}),
      ...(d.kind !== 'off' && d.start ? { start: d.start.slice(0, 5) } : {}),
      ...(d.kind !== 'off' && d.end ? { end: d.end.slice(0, 5) } : {}),
    })),
    accent: input.accent,
    isActive: input.isActive,
    note: input.note || null,
  };
}

export async function createPattern(userId: string, input: PatternInput): Promise<ShiftPattern> {
  const segment = await getWorkSegment(userId);
  const [row] = await db
    .insert(shiftPatterns)
    .values({ userId, lifeSegmentId: segment.id, ...patternValues(input) })
    .returning();
  return row;
}

export async function updatePattern(userId: string, id: string, input: PatternInput) {
  await getPatternOrThrow(userId, id);
  await db
    .update(shiftPatterns)
    .set(patternValues(input))
    .where(and(eq(shiftPatterns.userId, userId), eq(shiftPatterns.id, id)));
}

export async function setPatternActive(userId: string, id: string, isActive: boolean) {
  await getPatternOrThrow(userId, id);
  await db
    .update(shiftPatterns)
    .set({ isActive })
    .where(and(eq(shiftPatterns.userId, userId), eq(shiftPatterns.id, id)));
}

/** Soft-deletes the pattern; manual shifts that pointed at it keep their date and lose the link. */
export async function removePattern(userId: string, id: string) {
  await getPatternOrThrow(userId, id);
  await db
    .update(shifts)
    .set({ patternId: null })
    .where(and(eq(shifts.userId, userId), eq(shifts.patternId, id)));
  await db
    .update(shiftPatterns)
    .set({ deletedAt: new Date(), isActive: false })
    .where(and(eq(shiftPatterns.userId, userId), eq(shiftPatterns.id, id)));
}

// Manual shifts

export async function getShiftOrThrow(userId: string, id: string): Promise<Shift> {
  const [row] = await db
    .select()
    .from(shifts)
    .where(and(eq(shifts.userId, userId), eq(shifts.id, id)))
    .limit(1);
  if (!row) throw new NotFoundError('That shift does not exist.');
  return row;
}

function shiftValues(input: ShiftInput) {
  const timed = input.kind !== 'off' && input.startTime && input.endTime;
  return {
    date: input.date,
    kind: input.kind,
    label: input.label || null,
    startTime: timed ? input.startTime!.slice(0, 5) : null,
    endTime: timed ? input.endTime!.slice(0, 5) : null,
    note: input.note || null,
  };
}

export async function createShift(userId: string, input: ShiftInput): Promise<Shift> {
  const segment = await getWorkSegment(userId);
  const [row] = await db
    .insert(shifts)
    .values({ userId, lifeSegmentId: segment.id, ...shiftValues(input) })
    .returning();
  return row;
}

export async function updateShift(userId: string, id: string, input: ShiftInput) {
  await getShiftOrThrow(userId, id);
  await db
    .update(shifts)
    .set(shiftValues(input))
    .where(and(eq(shifts.userId, userId), eq(shifts.id, id)));
}

/** Manual shifts are overrides, not history, so they are removed outright. */
export async function removeShift(userId: string, id: string) {
  await getShiftOrThrow(userId, id);
  await db.delete(shifts).where(and(eq(shifts.userId, userId), eq(shifts.id, id)));
}

// Leave periods

export async function getLeaveOrThrow(userId: string, id: string): Promise<LeavePeriod> {
  const [row] = await db
    .select()
    .from(leavePeriods)
    .where(
      and(eq(leavePeriods.userId, userId), eq(leavePeriods.id, id), isNull(leavePeriods.deletedAt))
    )
    .limit(1);
  if (!row) throw new NotFoundError('That leave period does not exist.');
  return row;
}

function leaveValues(input: LeaveInput) {
  return {
    kind: input.kind,
    status: input.status,
    startDate: input.startDate,
    endDate: input.endDate,
    note: input.note || null,
  };
}

export async function createLeave(userId: string, input: LeaveInput): Promise<LeavePeriod> {
  const segment = await getWorkSegment(userId);
  const [row] = await db
    .insert(leavePeriods)
    .values({ userId, lifeSegmentId: segment.id, ...leaveValues(input) })
    .returning();
  return row;
}

export async function updateLeave(userId: string, id: string, input: LeaveInput) {
  await getLeaveOrThrow(userId, id);
  await db
    .update(leavePeriods)
    .set(leaveValues(input))
    .where(and(eq(leavePeriods.userId, userId), eq(leavePeriods.id, id)));
}

export async function removeLeave(userId: string, id: string) {
  await getLeaveOrThrow(userId, id);
  await db
    .update(leavePeriods)
    .set({ deletedAt: new Date() })
    .where(and(eq(leavePeriods.userId, userId), eq(leavePeriods.id, id)));
}

// Public holidays

/** One holiday per date: adding a second on the same day renames the first. */
export async function saveHoliday(userId: string, input: HolidayInput): Promise<PublicHoliday> {
  const [row] = await db
    .insert(publicHolidays)
    .values({ userId, date: input.date, name: input.name })
    .onConflictDoUpdate({
      target: [publicHolidays.userId, publicHolidays.date],
      set: { name: input.name },
    })
    .returning();
  return row;
}

export async function removeHoliday(userId: string, id: string) {
  const [row] = await db
    .select({ id: publicHolidays.id })
    .from(publicHolidays)
    .where(and(eq(publicHolidays.userId, userId), eq(publicHolidays.id, id)))
    .limit(1);
  if (!row) throw new NotFoundError('That holiday does not exist.');
  await db
    .delete(publicHolidays)
    .where(and(eq(publicHolidays.userId, userId), eq(publicHolidays.id, id)));
}
