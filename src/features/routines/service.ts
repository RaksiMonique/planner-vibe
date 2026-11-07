import 'server-only';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { habits, lifeSegments, routineCompletions, routineSteps, routines } from '@/db/schema';
import { checkIn, uncheck } from '@/features/habits/service';
import { NotFoundError, ValidationError } from '@/lib/errors';
import type { Routine, RoutineCompletion, RoutineStep } from './queries';
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
    daysOfWeek: input.daysOfWeek,
    isTemplate: input.isTemplate,
  };
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
  return db.transaction(async (tx) => {
    const [routine] = await tx
      .insert(routines)
      .values({ ...toValues(input), userId })
      .returning();
    await tx
      .insert(routineSteps)
      .values(input.steps.map((s, i) => stepValues(userId, routine.id, s, i)));
    return routine;
  });
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

  return db.transaction(async (tx) => {
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
}

export async function removeRoutine(userId: string, id: string) {
  await getRoutineOrThrow(userId, id);
  await db
    .update(routines)
    .set({ deletedAt: new Date() })
    .where(and(eq(routines.userId, userId), eq(routines.id, id)));
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
  return db.transaction(async (tx) => {
    const [copy] = await tx
      .insert(routines)
      .values({
        userId,
        name: source.name,
        kind: source.kind,
        lifeSegmentId: source.lifeSegmentId,
        daysOfWeek: source.daysOfWeek,
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
