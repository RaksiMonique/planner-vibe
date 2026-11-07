import 'server-only';
import { and, asc, desc, eq, gte, isNull, lte, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import { lifeSegments, tasks } from '@/db/schema';
import { segmentRefColumns } from '@/features/life-segments/queries';
import type { SegmentRef } from '@/features/life-segments/types';

export type Task = typeof tasks.$inferSelect;
export type TaskRow = Task & { segment: SegmentRef };

export type TaskFilters = {
  lifeSegmentId?: string;
  projectId?: string;
  goalId?: string;
  milestoneId?: string;
  /** `null` returns top-level tasks only. */
  parentTaskId?: string | null;
  /** Defaults to 'open'. */
  status?: 'open' | 'done' | 'all';
  /** yyyy-MM-dd, inclusive. */
  dueFrom?: string;
  dueTo?: string;
  onlyWithDueDate?: boolean;
};

export async function listTasks(userId: string, filters: TaskFilters = {}): Promise<TaskRow[]> {
  const conds = [eq(tasks.userId, userId), isNull(tasks.deletedAt)];
  if (filters.lifeSegmentId) conds.push(eq(tasks.lifeSegmentId, filters.lifeSegmentId));
  if (filters.projectId) conds.push(eq(tasks.projectId, filters.projectId));
  if (filters.goalId) conds.push(eq(tasks.goalId, filters.goalId));
  if (filters.milestoneId) conds.push(eq(tasks.milestoneId, filters.milestoneId));
  if (filters.parentTaskId === null) conds.push(isNull(tasks.parentTaskId));
  else if (filters.parentTaskId) conds.push(eq(tasks.parentTaskId, filters.parentTaskId));
  const status = filters.status ?? 'open';
  if (status === 'open') conds.push(ne(tasks.status, 'done'));
  if (status === 'done') conds.push(eq(tasks.status, 'done'));
  if (filters.dueFrom) conds.push(gte(tasks.dueDate, filters.dueFrom));
  if (filters.dueTo) conds.push(lte(tasks.dueDate, filters.dueTo));
  if (filters.onlyWithDueDate) conds.push(sql`${tasks.dueDate} is not null`);

  const rows = await db
    .select({ task: tasks, segment: segmentRefColumns })
    .from(tasks)
    .innerJoin(lifeSegments, eq(tasks.lifeSegmentId, lifeSegments.id))
    .where(and(...conds))
    .orderBy(
      asc(tasks.dueDate),
      desc(tasks.isImportant),
      asc(tasks.sortOrder),
      asc(tasks.createdAt)
    );
  return rows.map((r) => ({ ...r.task, segment: r.segment }));
}

export async function getTask(userId: string, id: string): Promise<TaskRow | null> {
  const [row] = await db
    .select({ task: tasks, segment: segmentRefColumns })
    .from(tasks)
    .innerJoin(lifeSegments, eq(tasks.lifeSegmentId, lifeSegments.id))
    .where(and(eq(tasks.userId, userId), eq(tasks.id, id), isNull(tasks.deletedAt)))
    .limit(1);
  return row ? { ...row.task, segment: row.segment } : null;
}

/** Open task counts keyed by Life Segment id. */
export async function countOpenTasksBySegment(userId: string): Promise<Record<string, number>> {
  const rows = await db
    .select({ id: tasks.lifeSegmentId, count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt), ne(tasks.status, 'done')))
    .groupBy(tasks.lifeSegmentId);
  return Object.fromEntries(rows.map((r) => [r.id, r.count]));
}

/** Open subtask counts keyed by parent task id. */
export async function countOpenSubtasks(userId: string): Promise<Record<string, number>> {
  const rows = await db
    .select({ id: tasks.parentTaskId, count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt),
        ne(tasks.status, 'done'),
        sql`${tasks.parentTaskId} is not null`
      )
    )
    .groupBy(tasks.parentTaskId);
  return Object.fromEntries(rows.map((r) => [r.id as string, r.count]));
}
