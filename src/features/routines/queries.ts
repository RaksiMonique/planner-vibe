import 'server-only';
import { and, asc, eq, gte, inArray, isNull, lte } from 'drizzle-orm';
import { db } from '@/db';
import { lifeSegments, routineCompletions, routineSteps, routines } from '@/db/schema';
import { segmentRefColumns } from '@/features/life-segments/queries';
import type { SegmentRef } from '@/features/life-segments/types';

export type Routine = typeof routines.$inferSelect;
export type RoutineStep = typeof routineSteps.$inferSelect;
export type RoutineCompletion = typeof routineCompletions.$inferSelect;
export type RoutineRow = Routine & { segment: SegmentRef; steps: RoutineStep[] };

export async function listRoutines(
  userId: string,
  opts: { includeTemplates?: boolean } = {}
): Promise<RoutineRow[]> {
  const conds = [eq(routines.userId, userId), isNull(routines.deletedAt)];
  if (!opts.includeTemplates) conds.push(eq(routines.isTemplate, false));
  const rows = await db
    .select({ routine: routines, segment: segmentRefColumns })
    .from(routines)
    .innerJoin(lifeSegments, eq(routines.lifeSegmentId, lifeSegments.id))
    .where(and(...conds))
    .orderBy(asc(routines.kind), asc(routines.createdAt));
  if (rows.length === 0) return [];
  const steps = await db
    .select()
    .from(routineSteps)
    .where(
      inArray(
        routineSteps.routineId,
        rows.map((r) => r.routine.id)
      )
    )
    .orderBy(asc(routineSteps.sortOrder), asc(routineSteps.createdAt));
  return rows.map((r) => ({
    ...r.routine,
    segment: r.segment,
    steps: steps.filter((s) => s.routineId === r.routine.id),
  }));
}

/** Routines scheduled on a weekday (0 = Sunday … 6 = Saturday). */
export async function listRoutinesForDay(userId: string, dayOfWeek: number): Promise<RoutineRow[]> {
  const all = await listRoutines(userId);
  return all.filter((r) => r.daysOfWeek.includes(dayOfWeek));
}

/** Completions with yyyy-MM-dd dates in [fromKey, toKey], inclusive. */
export async function listCompletionsBetween(
  userId: string,
  fromKey: string,
  toKey: string
): Promise<RoutineCompletion[]> {
  return db
    .select()
    .from(routineCompletions)
    .where(
      and(
        eq(routineCompletions.userId, userId),
        gte(routineCompletions.date, fromKey),
        lte(routineCompletions.date, toKey)
      )
    )
    .orderBy(asc(routineCompletions.date));
}

// ── Today's routines with their completion rows ───────────────────────────────

import { parseISO } from 'date-fns';

export type RoutineDay = RoutineRow & { completion: RoutineCompletion | null };

/** Routines scheduled on the weekday of `dateKey`, with that day's completion row if any. */
export async function listRoutinesWithCompletions(
  userId: string,
  dateKey: string
): Promise<RoutineDay[]> {
  const scheduled = await listRoutinesForDay(userId, parseISO(dateKey).getDay());
  if (scheduled.length === 0) return [];
  const completions = await listCompletionsBetween(userId, dateKey, dateKey);
  return scheduled.map((r) => ({
    ...r,
    completion: completions.find((c) => c.routineId === r.id) ?? null,
  }));
}
