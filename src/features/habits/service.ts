import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { habitCheckIns, habits, lifeSegments } from '@/db/schema';
import { NotFoundError, ValidationError } from '@/lib/errors';
import type { Habit } from './queries';
import type { HabitInput } from './schema';

export async function getHabitOrThrow(userId: string, id: string): Promise<Habit> {
  const [row] = await db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, userId), eq(habits.id, id), isNull(habits.deletedAt)))
    .limit(1);
  if (!row) throw new NotFoundError('That habit does not exist.');
  return row;
}

async function assertSegmentOwned(userId: string, lifeSegmentId: string) {
  const count = await db.$count(
    lifeSegments,
    and(eq(lifeSegments.id, lifeSegmentId), eq(lifeSegments.userId, userId))
  );
  if (count === 0) throw new ValidationError('That Life Segment does not exist.');
}

function toValues(input: HabitInput) {
  return {
    name: input.name,
    lifeSegmentId: input.lifeSegmentId,
    frequency: input.frequency,
    target: input.target,
    accent: input.accent ?? null,
    reminderTime: input.reminderTime ? `${input.reminderTime}:00` : null,
  };
}

export async function createHabit(userId: string, input: HabitInput): Promise<Habit> {
  await assertSegmentOwned(userId, input.lifeSegmentId);
  const [row] = await db
    .insert(habits)
    .values({ ...toValues(input), userId })
    .returning();
  return row;
}

export async function updateHabit(userId: string, id: string, input: HabitInput): Promise<Habit> {
  await getHabitOrThrow(userId, id);
  await assertSegmentOwned(userId, input.lifeSegmentId);
  const [row] = await db
    .update(habits)
    .set(toValues(input))
    .where(and(eq(habits.userId, userId), eq(habits.id, id)))
    .returning();
  return row;
}

export async function setHabitArchived(userId: string, id: string, archived: boolean) {
  await getHabitOrThrow(userId, id);
  await db
    .update(habits)
    .set({ archivedAt: archived ? new Date() : null })
    .where(and(eq(habits.userId, userId), eq(habits.id, id)));
}

/** Soft delete; check-ins stay for history and cascade only on hard delete. */
export async function removeHabit(userId: string, id: string) {
  await getHabitOrThrow(userId, id);
  await db
    .update(habits)
    .set({ deletedAt: new Date(), archivedAt: new Date() })
    .where(and(eq(habits.userId, userId), eq(habits.id, id)));
}

/** Records (or re-records) a check-in for one date. Idempotent per date. */
export async function checkIn(userId: string, habitId: string, dateKey: string, value = 1) {
  await getHabitOrThrow(userId, habitId);
  await db
    .insert(habitCheckIns)
    .values({ userId, habitId, date: dateKey, value })
    .onConflictDoUpdate({
      target: [habitCheckIns.habitId, habitCheckIns.date],
      set: { value },
    });
}

export async function uncheck(userId: string, habitId: string, dateKey: string) {
  await getHabitOrThrow(userId, habitId);
  await db
    .delete(habitCheckIns)
    .where(
      and(
        eq(habitCheckIns.userId, userId),
        eq(habitCheckIns.habitId, habitId),
        eq(habitCheckIns.date, dateKey)
      )
    );
}
