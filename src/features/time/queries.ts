import 'server-only';
import { and, asc, eq, gt, inArray, isNotNull, isNull, lt, lte } from 'drizzle-orm';
import { db } from '@/db';
import {
  lifeSegments,
  projects,
  tasks,
  timeBlockTemplates,
  timeBlocks,
  timeEntries,
} from '@/db/schema';
import { segmentRefColumns } from '@/features/life-segments/queries';
import type { SegmentRef } from '@/features/life-segments/types';

export type TimeBlock = typeof timeBlocks.$inferSelect;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type TimeBlockTemplate = typeof timeBlockTemplates.$inferSelect;
export type TimeBlockRow = TimeBlock & { segment: SegmentRef };
export type TimeEntryRow = TimeEntry & { segment: SegmentRef };

/** Planned blocks overlapping [from, to). Recurring definitions come back unexpanded. */
export async function listTimeBlocksBetween(
  userId: string,
  from: Date,
  to: Date
): Promise<TimeBlockRow[]> {
  const rows = await db
    .select({ block: timeBlocks, segment: segmentRefColumns })
    .from(timeBlocks)
    .innerJoin(lifeSegments, eq(timeBlocks.lifeSegmentId, lifeSegments.id))
    .where(
      and(
        eq(timeBlocks.userId, userId),
        isNull(timeBlocks.deletedAt),
        lt(timeBlocks.startsAt, to),
        gt(timeBlocks.endsAt, from)
      )
    )
    .orderBy(asc(timeBlocks.startsAt));
  return rows.map((r) => ({ ...r.block, segment: r.segment }));
}

/** Actual time entries that started in [from, to). */
export async function listTimeEntriesBetween(
  userId: string,
  from: Date,
  to: Date
): Promise<TimeEntryRow[]> {
  const rows = await db
    .select({ entry: timeEntries, segment: segmentRefColumns })
    .from(timeEntries)
    .innerJoin(lifeSegments, eq(timeEntries.lifeSegmentId, lifeSegments.id))
    .where(
      and(
        eq(timeEntries.userId, userId),
        gt(timeEntries.startedAt, from),
        lt(timeEntries.startedAt, to)
      )
    )
    .orderBy(asc(timeEntries.startedAt));
  return rows.map((r) => ({ ...r.entry, segment: r.segment }));
}

/**
 * Recurring block definitions that started before `before`. Their own
 * `startsAt` may sit outside a range, so a range query misses them; the
 * caller expands them with `expandTimeBlocks`.
 */
export async function listRecurringTimeBlocks(
  userId: string,
  before: Date
): Promise<TimeBlockRow[]> {
  const rows = await db
    .select({ block: timeBlocks, segment: segmentRefColumns })
    .from(timeBlocks)
    .innerJoin(lifeSegments, eq(timeBlocks.lifeSegmentId, lifeSegments.id))
    .where(
      and(
        eq(timeBlocks.userId, userId),
        isNull(timeBlocks.deletedAt),
        isNotNull(timeBlocks.rrule),
        lte(timeBlocks.startsAt, before)
      )
    )
    .orderBy(asc(timeBlocks.startsAt));
  return rows.map((r) => ({ ...r.block, segment: r.segment }));
}

/** Project titles keyed by id, for labelling aggregated time. Deleted projects still resolve. */
export async function listProjectTitles(
  userId: string,
  ids: string[]
): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const rows = await db
    .select({ id: projects.id, title: projects.title })
    .from(projects)
    .where(and(eq(projects.userId, userId), inArray(projects.id, ids)));
  return Object.fromEntries(rows.map((r) => [r.id, r.title]));
}

/** Task titles keyed by id, for labelling aggregated time. Deleted tasks still resolve. */
export async function listTaskTitles(
  userId: string,
  ids: string[]
): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const rows = await db
    .select({ id: tasks.id, title: tasks.title })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), inArray(tasks.id, ids)));
  return Object.fromEntries(rows.map((r) => [r.id, r.title]));
}

export async function listTimeBlockTemplates(userId: string): Promise<TimeBlockTemplate[]> {
  return db
    .select()
    .from(timeBlockTemplates)
    .where(eq(timeBlockTemplates.userId, userId))
    .orderBy(asc(timeBlockTemplates.name));
}
