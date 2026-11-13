import 'server-only';
import { addDays, format, parseISO } from 'date-fns';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { leavePeriods, publicHolidays, shiftKinds, shiftPatterns, shifts } from '@/db/schema';
import { NotFoundError, ValidationError } from '@/lib/errors';
import {
  getWorkSegment,
  type LeavePeriod,
  type PublicHoliday,
  type Shift,
  type ShiftKindRow,
  type ShiftPattern,
} from './queries';
import {
  SHIFT_KIND_LABELS,
  SHIFT_KINDS,
  type HolidayInput,
  type LeaveInput,
  type PatternInput,
  type ShiftInput,
  type ShiftKind,
  type ShiftKindInput,
} from './schema';

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

const dayBefore = (key: string) => format(addDays(parseISO(key), -1), 'yyyy-MM-dd');

/**
 * Whether a repeating record produced days before `day` that the reader may
 * have lived by: it must have started, and have existed, before that day.
 * Creation is read in the server's zone, which is close enough for a day.
 */
function ranBefore(start: string | null, createdAt: Date, day: string): boolean {
  const created = format(createdAt, 'yyyy-MM-dd');
  const began = start && start > created ? start : created;
  return began < day;
}

function patternValues(input: PatternInput) {
  return {
    name: input.name,
    anchorDate: input.anchorDate,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
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

/**
 * With `applyFrom`, the days before it keep the old pattern: the existing row
 * ends the day before and a new row carries the changes from that day on.
 * Without it, or when the pattern has no days before it, the row is changed
 * in place.
 */
export async function updatePattern(userId: string, id: string, input: PatternInput) {
  const current = await getPatternOrThrow(userId, id);
  const { applyFrom } = input;
  const hasPast = applyFrom && ranBefore(current.startDate, current.createdAt, applyFrom);
  const stillRunning = applyFrom && (!current.endDate || current.endDate >= applyFrom);
  if (applyFrom && hasPast && stillRunning) {
    await db
      .update(shiftPatterns)
      .set({ endDate: dayBefore(applyFrom) })
      .where(and(eq(shiftPatterns.userId, userId), eq(shiftPatterns.id, id)));
    await db.insert(shiftPatterns).values({
      userId,
      lifeSegmentId: current.lifeSegmentId,
      ...patternValues(input),
      startDate: applyFrom,
      endDate: input.endDate && input.endDate >= applyFrom ? input.endDate : null,
    });
    return;
  }
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

/**
 * A pattern that has already produced days ends the day before `todayKey`,
 * so the past keeps what it had; one that has not yet started, or had
 * already ended, is soft-deleted. Manual shifts that pointed at it keep
 * their date and lose the link.
 */
export async function removePattern(userId: string, id: string, todayKey: string) {
  const current = await getPatternOrThrow(userId, id);
  const hasPast = ranBefore(current.startDate, current.createdAt, todayKey);
  const stillRunning = !current.endDate || current.endDate >= todayKey;
  if (hasPast && stillRunning) {
    await db
      .update(shiftPatterns)
      .set({ endDate: dayBefore(todayKey) })
      .where(and(eq(shiftPatterns.userId, userId), eq(shiftPatterns.id, id)));
    return;
  }
  await db
    .update(shifts)
    .set({ patternId: null })
    .where(and(eq(shifts.userId, userId), eq(shifts.patternId, id)));
  await db
    .update(shiftPatterns)
    .set({ deletedAt: new Date(), isActive: false })
    .where(and(eq(shiftPatterns.userId, userId), eq(shiftPatterns.id, id)));
}

// Shift kinds of the user's own

const squeeze = (name: string) => name.trim().replace(/\s+/g, ' ');

async function findKindByName(userId: string, name: string): Promise<ShiftKindRow | undefined> {
  const [row] = await db
    .select()
    .from(shiftKinds)
    .where(and(eq(shiftKinds.userId, userId), sql`lower(${shiftKinds.name}) = lower(${name})`))
    .limit(1);
  return row;
}

export async function getShiftKindOrThrow(userId: string, id: string): Promise<ShiftKindRow> {
  const [row] = await db
    .select()
    .from(shiftKinds)
    .where(and(eq(shiftKinds.userId, userId), eq(shiftKinds.id, id)))
    .limit(1);
  if (!row) throw new NotFoundError('That kind of shift does not exist.');
  return row;
}

function assertNotBuiltIn(name: string) {
  const taken = SHIFT_KINDS.some((k) => SHIFT_KIND_LABELS[k].toLowerCase() === name.toLowerCase());
  if (taken) throw new ValidationError(`${name} is already a built-in kind.`);
}

export async function createShiftKind(
  userId: string,
  input: ShiftKindInput
): Promise<ShiftKindRow> {
  const name = squeeze(input.name);
  assertNotBuiltIn(name);
  if (await findKindByName(userId, name))
    throw new ValidationError('You already have a kind with that name.');
  const [row] = await db
    .insert(shiftKinds)
    .values({ userId, name, countsAs: input.countsAs, accent: input.accent })
    .returning();
  return row;
}

/** Shifts of this kind count as its new `countsAs` from now on. */
export async function updateShiftKind(userId: string, id: string, input: ShiftKindInput) {
  await getShiftKindOrThrow(userId, id);
  const name = squeeze(input.name);
  assertNotBuiltIn(name);
  const clash = await findKindByName(userId, name);
  if (clash && clash.id !== id)
    throw new ValidationError('You already have a kind with that name.');
  await db
    .update(shiftKinds)
    .set({ name, countsAs: input.countsAs, accent: input.accent })
    .where(and(eq(shiftKinds.userId, userId), eq(shiftKinds.id, id)));
  await db
    .update(shifts)
    .set({ kind: input.countsAs })
    .where(and(eq(shifts.userId, userId), eq(shifts.kindId, id)));
}

/** Its shifts keep their days and fall back to the built-in kind they counted as. */
export async function removeShiftKind(userId: string, id: string) {
  await getShiftKindOrThrow(userId, id);
  await db.delete(shiftKinds).where(and(eq(shiftKinds.userId, userId), eq(shiftKinds.id, id)));
}

/** The built-in kind a shift counts as, and the user's own kind behind it, if any. */
async function resolveKind(
  userId: string,
  input: ShiftInput
): Promise<{ kind: ShiftKind; kindId: string | null }> {
  if (input.newKind) {
    const name = squeeze(input.newKind);
    const existing = await findKindByName(userId, name);
    const own =
      existing ??
      (await createShiftKind(userId, {
        name,
        countsAs: input.newKindCountsAs,
        accent: 'burgundy',
      }));
    return { kind: own.countsAs, kindId: own.id };
  }
  if (input.kind.startsWith('kind:')) {
    const own = await getShiftKindOrThrow(userId, input.kind.slice(5));
    return { kind: own.countsAs, kindId: own.id };
  }
  return { kind: input.kind as ShiftKind, kindId: null };
}

// Manual shifts

export async function getShiftOrThrow(userId: string, id: string): Promise<Shift> {
  const [row] = await db
    .select()
    .from(shifts)
    .where(and(eq(shifts.userId, userId), eq(shifts.id, id), isNull(shifts.deletedAt)))
    .limit(1);
  if (!row) throw new NotFoundError('That shift does not exist.');
  return row;
}

async function shiftValues(userId: string, input: ShiftInput) {
  const { kind, kindId } = await resolveKind(userId, input);
  const timed = kind !== 'off' && input.startTime && input.endTime;
  const repeatUnit = input.repeatUnit === 'none' ? null : input.repeatUnit;
  return {
    date: input.date,
    endDate: input.endDate && input.endDate !== input.date ? input.endDate : null,
    kind,
    kindId,
    label: input.label || null,
    startTime: timed ? input.startTime!.slice(0, 5) : null,
    endTime: timed ? input.endTime!.slice(0, 5) : null,
    repeatEvery: repeatUnit ? input.repeatEvery : 0,
    repeatUnit: repeatUnit ?? 'week',
    repeatUntil: repeatUnit && input.repeatUntil ? input.repeatUntil : null,
    note: input.note || null,
  };
}

export async function createShift(userId: string, input: ShiftInput): Promise<Shift> {
  const segment = await getWorkSegment(userId);
  const [row] = await db
    .insert(shifts)
    .values({ userId, lifeSegmentId: segment.id, ...(await shiftValues(userId, input)) })
    .returning();
  return row;
}

/**
 * A repeating shift whose first day is moved later is split: the old row
 * ends the day before the new first day and a new row carries the changes
 * from there, so the days already worked keep their old times. Anything
 * else is changed in place.
 */
export async function updateShift(userId: string, id: string, input: ShiftInput) {
  const current = await getShiftOrThrow(userId, id);
  const values = await shiftValues(userId, input);
  const splits =
    current.repeatEvery > 0 &&
    ranBefore(current.date, current.createdAt, input.date) &&
    (!current.repeatUntil || current.repeatUntil >= input.date);
  if (splits) {
    await db
      .update(shifts)
      .set({ repeatUntil: dayBefore(input.date) })
      .where(and(eq(shifts.userId, userId), eq(shifts.id, id)));
    await db.insert(shifts).values({
      userId,
      lifeSegmentId: current.lifeSegmentId,
      patternId: current.patternId,
      ...values,
    });
    return;
  }
  await db
    .update(shifts)
    .set(values)
    .where(and(eq(shifts.userId, userId), eq(shifts.id, id)));
}

/**
 * A repeating shift that has already produced days ends the day before
 * `todayKey`, keeping the past; everything else is soft-deleted, so a data
 * export still shows what was planned.
 */
export async function removeShift(userId: string, id: string, todayKey: string) {
  const current = await getShiftOrThrow(userId, id);
  const hasPast = current.repeatEvery > 0 && ranBefore(current.date, current.createdAt, todayKey);
  const stillRunning = !current.repeatUntil || current.repeatUntil >= todayKey;
  if (hasPast && stillRunning) {
    await db
      .update(shifts)
      .set({ repeatUntil: dayBefore(todayKey) })
      .where(and(eq(shifts.userId, userId), eq(shifts.id, id)));
    return;
  }
  await db
    .update(shifts)
    .set({ deletedAt: new Date() })
    .where(and(eq(shifts.userId, userId), eq(shifts.id, id)));
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
