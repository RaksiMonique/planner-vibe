import 'server-only';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { addMinutes, format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { db } from '@/db';
import { habits, lifeSegments, routineCompletions, routineSteps, routines } from '@/db/schema';
import { listCalendars } from '@/features/calendar/queries';
import { WEEKDAY_CODES } from '@/features/calendar/recurrence';
import { eventInput } from '@/features/calendar/schema';
import { createEvent, removeEvent, updateEvent } from '@/features/calendar/service';
import { checkIn, uncheck } from '@/features/habits/service';
import { getPreferences } from '@/features/settings/service';
import { NotFoundError, ValidationError } from '@/lib/errors';
import type { Routine, RoutineCompletion, RoutineStep } from './queries';
import { nextDueOn } from './schedule';
import type { RoutineInput, StepInput } from './schema';

export async function getRoutineOrThrow(userId: string, id: string): Promise<Routine> {
  const [row] = await db
    .select()
    .from(routines)
    .where(and(eq(routines.userId, userId), eq(routines.id, id), isNull(routines.deletedAt)))
    .limit(1);
  if (!row) throw new NotFoundError('That routine does not exist.');
  return row;
}

async function listSteps(routineId: string): Promise<RoutineStep[]> {
  return db
    .select()
    .from(routineSteps)
    .where(eq(routineSteps.routineId, routineId))
    .orderBy(routineSteps.sortOrder, routineSteps.createdAt);
}

async function assertOwned(userId: string, input: RoutineInput) {
  const segment = await db.$count(
    lifeSegments,
    and(eq(lifeSegments.id, input.lifeSegmentId), eq(lifeSegments.userId, userId))
  );
  if (segment === 0) throw new ValidationError('That Life Segment does not exist.');
  const habitIds = [...new Set(input.steps.flatMap((s) => (s.habitId ? [s.habitId] : [])))];
  if (habitIds.length > 0) {
    const owned = await db.$count(
      habits,
      and(eq(habits.userId, userId), inArray(habits.id, habitIds), isNull(habits.deletedAt))
    );
    if (owned !== habitIds.length)
      throw new ValidationError('One of the linked habits does not exist.');
  }
}

function toValues(input: RoutineInput) {
  return {
    name: input.name,
    kind: input.kind,
    lifeSegmentId: input.lifeSegmentId,
    frequency: input.frequency,
    interval: input.interval,
    startsOn: input.startsOn,
    daysOfWeek: input.daysOfWeek,
    appointmentTime: input.appointmentTime,
    appointmentMinutes: input.appointmentMinutes,
    location: input.location,
    isTemplate: input.isTemplate,
  };
}

/**
 * Keeps a routine's appointment on the calendar: one recurring Event in the
 * appointment category, on the routine's own cadence, starting from its first
 * run. Removed again when the routine loses its appointment or becomes a
 * template. Returns the event id the routine should carry.
 */
async function syncAppointment(userId: string, routine: Routine): Promise<string | null> {
  const dropExisting = async () => {
    if (routine.eventId) await removeEvent(userId, routine.eventId).catch(() => undefined);
    return null;
  };
  if (routine.isTemplate || !routine.appointmentTime) return dropExisting();

  const prefs = await getPreferences(userId);
  const fromKey =
    routine.startsOn ?? formatInTimeZone(routine.createdAt, prefs.timeZone, 'yyyy-MM-dd');
  const firstKey = nextDueOn(routine, fromKey, prefs.weekStartsOn);
  if (!firstKey) return dropExisting();

  const calendars = await listCalendars(userId);
  const calendar = calendars.find((c) => c.kind === 'personal') ?? calendars[0];
  const startsAt = `${firstKey}T${routine.appointmentTime}`;
  const endsAt = format(
    addMinutes(parseISO(startsAt), routine.appointmentMinutes ?? 60),
    "yyyy-MM-dd'T'HH:mm"
  );
  const input = eventInput.parse({
    title: routine.name,
    calendarId: calendar.id,
    lifeSegmentId: routine.lifeSegmentId,
    category: 'appointment',
    isAllDay: false,
    startsAt,
    endsAt,
    location: routine.location ?? undefined,
    recurrence: routine.frequency,
    recurrenceInterval: routine.interval,
    recurrenceDays:
      routine.frequency === 'weekly'
        ? routine.daysOfWeek.map((d) => WEEKDAY_CODES[(d + 6) % 7])
        : [],
    recurrenceMonthly: 'day',
    recurrenceEnd: 'never',
  });
  if (routine.eventId) {
    try {
      await updateEvent(userId, routine.eventId, input, prefs.timeZone);
      return routine.eventId;
    } catch (e) {
      // The event was deleted from the calendar; make a fresh one.
      if (!(e instanceof NotFoundError)) throw e;
    }
  }
  const created = await createEvent(userId, input, prefs.timeZone);
  return created.id;
}

async function saveEventId(userId: string, routine: Routine): Promise<Routine> {
  const eventId = await syncAppointment(userId, routine);
  if (eventId === routine.eventId) return routine;
  const [row] = await db
    .update(routines)
    .set({ eventId })
    .where(and(eq(routines.userId, userId), eq(routines.id, routine.id)))
    .returning();
  return row;
}

function stepValues(userId: string, routineId: string, step: StepInput, sortOrder: number) {
  return {
    userId,
    routineId,
    sortOrder,
    title: step.title,
    durationMinutes: step.durationMinutes ?? null,
    habitId: step.habitId ?? null,
  };
}

export async function createRoutine(userId: string, input: RoutineInput): Promise<Routine> {
  await assertOwned(userId, input);
  const routine = await db.transaction(async (tx) => {
    const [routine] = await tx
      .insert(routines)
      .values({ ...toValues(input), userId })
      .returning();
    await tx
      .insert(routineSteps)
      .values(input.steps.map((s, i) => stepValues(userId, routine.id, s, i)));
    return routine;
  });
  return saveEventId(userId, routine);
}

/** Keeps existing step rows (by id) so completion history stays attached to them. */
export async function updateRoutine(
  userId: string,
  id: string,
  input: RoutineInput
): Promise<Routine> {
  await getRoutineOrThrow(userId, id);
  await assertOwned(userId, input);
  const existing = await listSteps(id);
  const existingIds = new Set(existing.map((s) => s.id));
  const keptIds = new Set(
    input.steps.flatMap((s) => (s.id && existingIds.has(s.id) ? [s.id] : []))
  );

  const routine = await db.transaction(async (tx) => {
    const [routine] = await tx
      .update(routines)
      .set(toValues(input))
      .where(and(eq(routines.userId, userId), eq(routines.id, id)))
      .returning();
    const removed = existing.filter((s) => !keptIds.has(s.id)).map((s) => s.id);
    if (removed.length > 0) {
      await tx.delete(routineSteps).where(inArray(routineSteps.id, removed));
    }
    for (const [i, step] of input.steps.entries()) {
      const values = stepValues(userId, id, step, i);
      if (step.id && keptIds.has(step.id)) {
        await tx.update(routineSteps).set(values).where(eq(routineSteps.id, step.id));
      } else {
        await tx.insert(routineSteps).values(values);
      }
    }
    return routine;
  });
  return saveEventId(userId, routine);
}

/** The routine's appointment leaves the calendar with it. */
export async function removeRoutine(userId: string, id: string) {
  const routine = await getRoutineOrThrow(userId, id);
  await db
    .update(routines)
    .set({ deletedAt: new Date() })
    .where(and(eq(routines.userId, userId), eq(routines.id, id)));
  if (routine.eventId) await removeEvent(userId, routine.eventId).catch(() => undefined);
}

/**
 * Copies a routine with fresh step rows. `asTemplate: true` saves a routine
 * as a reusable template; `false` creates a live routine from a template.
 */
export async function duplicateRoutine(
  userId: string,
  id: string,
  opts: { asTemplate: boolean }
): Promise<Routine> {
  const source = await getRoutineOrThrow(userId, id);
  const steps = await listSteps(id);
  const copy = await db.transaction(async (tx) => {
    const [copy] = await tx
      .insert(routines)
      .values({
        userId,
        name: source.name,
        kind: source.kind,
        lifeSegmentId: source.lifeSegmentId,
        frequency: source.frequency,
        interval: source.interval,
        startsOn: source.startsOn,
        daysOfWeek: source.daysOfWeek,
        appointmentTime: source.appointmentTime,
        appointmentMinutes: source.appointmentMinutes,
        location: source.location,
        isTemplate: opts.asTemplate,
      })
      .returning();
    if (steps.length > 0) {
      await tx.insert(routineSteps).values(
        steps.map((s, i) => ({
          userId,
          routineId: copy.id,
          sortOrder: i,
          title: s.title,
          durationMinutes: s.durationMinutes,
          habitId: s.habitId,
        }))
      );
    }
    return copy;
  });
  return saveEventId(userId, copy);
}

/**
 * Records one step as done or not for a date. The completion row is created
 * on first use; `completed_at` is set only while every step is done. A step
 * linked to a habit records (or removes) that habit's check-in for the date.
 */
export async function setStepDone(
  userId: string,
  routineId: string,
  stepId: string,
  dateKey: string,
  done: boolean
): Promise<RoutineCompletion> {
  await getRoutineOrThrow(userId, routineId);
  const steps = await listSteps(routineId);
  const step = steps.find((s) => s.id === stepId);
  if (!step) throw new NotFoundError('That step no longer exists.');

  const [current] = await db
    .select()
    .from(routineCompletions)
    .where(
      and(
        eq(routineCompletions.userId, userId),
        eq(routineCompletions.routineId, routineId),
        eq(routineCompletions.date, dateKey)
      )
    )
    .limit(1);
  const stepIds = steps.map((s) => s.id);
  const completed = new Set((current?.completedStepIds ?? []).filter((id) => stepIds.includes(id)));
  if (done) completed.add(stepId);
  else completed.delete(stepId);
  const completedStepIds = stepIds.filter((id) => completed.has(id));
  const complete = completedStepIds.length === stepIds.length && stepIds.length > 0;

  const [row] = await db
    .insert(routineCompletions)
    .values({
      userId,
      routineId,
      date: dateKey,
      completedStepIds,
      completedAt: complete ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: [routineCompletions.routineId, routineCompletions.date],
      set: {
        completedStepIds,
        completedAt: complete ? (current?.completedAt ?? new Date()) : null,
      },
    })
    .returning();

  if (step.habitId) {
    if (done) {
      await checkIn(userId, step.habitId, dateKey);
    } else {
      // Another completed step may still link the same habit.
      const stillLinked = steps.some(
        (s) => s.id !== step.id && s.habitId === step.habitId && completed.has(s.id)
      );
      if (!stillLinked) await uncheck(userId, step.habitId, dateKey);
    }
  }
  return row;
}
