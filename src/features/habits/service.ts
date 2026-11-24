import 'server-only';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import {
  bibleStudies,
  courses,
  habitCheckIns,
  habitPlanItems,
  habits,
  lifeSegments,
  readingPlans,
  routines,
  subjects,
} from '@/db/schema';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { linkColumns, parseLinkValue, type HabitLinkKind } from './links';
import type { Habit, HabitPlanItem } from './queries';
import type { HabitInput, PlanItemInput } from './schema';

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

const LINK_TABLES = {
  course: courses,
  subject: subjects,
  bible_study: bibleStudies,
  reading_plan: readingPlans,
  routine: routines,
} as const;

/** The linked row must be the user's own; a stale option is a validation error. */
async function assertLinkOwned(userId: string, link: { kind: HabitLinkKind; id: string } | null) {
  if (!link) return;
  const table = LINK_TABLES[link.kind];
  const n = await db.$count(table, and(eq(table.id, link.id), eq(table.userId, userId)));
  if (n === 0) throw new ValidationError('That link does not exist any more.');
}

function toValues(input: HabitInput) {
  return {
    name: input.name,
    lifeSegmentId: input.lifeSegmentId,
    frequency: input.frequency,
    target: input.target,
    accent: input.accent ?? null,
    reminderTime: input.reminderTime ? `${input.reminderTime}:00` : null,
    details: input.details || null,
    ...linkColumns(parseLinkValue(input.link)),
  };
}

export async function createHabit(userId: string, input: HabitInput): Promise<Habit> {
  await assertSegmentOwned(userId, input.lifeSegmentId);
  await assertLinkOwned(userId, parseLinkValue(input.link));
  const [row] = await db
    .insert(habits)
    .values({ ...toValues(input), userId })
    .returning();
  return row;
}

export async function updateHabit(userId: string, id: string, input: HabitInput): Promise<Habit> {
  await getHabitOrThrow(userId, id);
  await assertSegmentOwned(userId, input.lifeSegmentId);
  await assertLinkOwned(userId, parseLinkValue(input.link));
  const [row] = await db
    .update(habits)
    .set(toValues(input))
    .where(and(eq(habits.userId, userId), eq(habits.id, id)))
    .returning();
  return row;
}

// ── Plan items: what to do next time the habit's time comes ──

async function getPlanItemOrThrow(userId: string, id: string): Promise<HabitPlanItem> {
  const [row] = await db
    .select()
    .from(habitPlanItems)
    .where(and(eq(habitPlanItems.userId, userId), eq(habitPlanItems.id, id)))
    .limit(1);
  if (!row) throw new NotFoundError('That plan item does not exist.');
  return row;
}

export async function addPlanItem(userId: string, input: PlanItemInput): Promise<HabitPlanItem> {
  await getHabitOrThrow(userId, input.habitId);
  const existing = await db.$count(habitPlanItems, eq(habitPlanItems.habitId, input.habitId));
  const [row] = await db
    .insert(habitPlanItems)
    .values({
      userId,
      habitId: input.habitId,
      title: input.title,
      plannedDate: input.plannedDate ?? null,
      sortOrder: existing,
    })
    .returning();
  return row;
}

/**
 * Ticking an item off is doing the habit, so it also records today's check-in
 * (the same way a routine step does). Reopening an item leaves the check-in.
 */
export async function setPlanItemDone(
  userId: string,
  id: string,
  done: boolean,
  todayKey: string
): Promise<HabitPlanItem> {
  const item = await getPlanItemOrThrow(userId, id);
  await db
    .update(habitPlanItems)
    .set({ completedAt: done ? new Date() : null })
    .where(and(eq(habitPlanItems.userId, userId), eq(habitPlanItems.id, id)));
  if (done) await checkIn(userId, item.habitId, todayKey);
  return item;
}

export async function removePlanItem(userId: string, id: string) {
  const item = await getPlanItemOrThrow(userId, id);
  await db
    .delete(habitPlanItems)
    .where(and(eq(habitPlanItems.userId, userId), eq(habitPlanItems.id, id)));
  await renumberPlanItems(userId, item.habitId);
}

/** Swaps the item with its neighbour in the given direction. */
export async function movePlanItem(userId: string, id: string, direction: 'up' | 'down') {
  const item = await getPlanItemOrThrow(userId, id);
  const siblings = await db
    .select({ id: habitPlanItems.id })
    .from(habitPlanItems)
    .where(and(eq(habitPlanItems.userId, userId), eq(habitPlanItems.habitId, item.habitId)))
    .orderBy(asc(habitPlanItems.sortOrder), asc(habitPlanItems.createdAt));
  const index = siblings.findIndex((s) => s.id === id);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= siblings.length) return;
  const reordered = [...siblings];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  await Promise.all(
    reordered.map((s, i) =>
      db
        .update(habitPlanItems)
        .set({ sortOrder: i })
        .where(and(eq(habitPlanItems.userId, userId), eq(habitPlanItems.id, s.id)))
    )
  );
}

async function renumberPlanItems(userId: string, habitId: string) {
  const rows = await db
    .select({ id: habitPlanItems.id })
    .from(habitPlanItems)
    .where(and(eq(habitPlanItems.userId, userId), eq(habitPlanItems.habitId, habitId)))
    .orderBy(asc(habitPlanItems.sortOrder), asc(habitPlanItems.createdAt));
  await Promise.all(
    rows.map((r, i) =>
      db
        .update(habitPlanItems)
        .set({ sortOrder: i })
        .where(and(eq(habitPlanItems.userId, userId), eq(habitPlanItems.id, r.id)))
    )
  );
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
