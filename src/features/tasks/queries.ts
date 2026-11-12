import 'server-only';
import { and, asc, desc, eq, gte, inArray, isNull, lte, ne, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { lifeSegments, taskDependencies, tasks } from '@/db/schema';
import { segmentRefColumns } from '@/features/life-segments/queries';
import type { SegmentRef } from '@/features/life-segments/types';
import type { Blocker } from './dependencies';

export type Task = typeof tasks.$inferSelect;
/** `blockedBy` lists the still-open tasks this one waits on; empty means ready. */
export type TaskRow = Task & { segment: SegmentRef; blockedBy: Blocker[] };

/** Open blockers keyed by the waiting task's id, for one task or all of the user's. */
async function openBlockersByTask(
  userId: string,
  taskId?: string
): Promise<Map<string, Blocker[]>> {
  const conds = [
    eq(taskDependencies.userId, userId),
    isNull(tasks.deletedAt),
    ne(tasks.status, 'done'),
  ];
  if (taskId) conds.push(eq(taskDependencies.taskId, taskId));
  const rows = await db
    .select({ taskId: taskDependencies.taskId, id: tasks.id, title: tasks.title })
    .from(taskDependencies)
    .innerJoin(tasks, eq(tasks.id, taskDependencies.dependsOnTaskId))
    .where(and(...conds))
    .orderBy(asc(tasks.dueDate), asc(tasks.title));
  const map = new Map<string, Blocker[]>();
  for (const r of rows) {
    const list = map.get(r.taskId) ?? [];
    list.push({ id: r.id, title: r.title });
    map.set(r.taskId, list);
  }
  return map;
}

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

  const [rows, blockers] = await Promise.all([
    db
      .select({ task: tasks, segment: segmentRefColumns })
      .from(tasks)
      .innerJoin(lifeSegments, eq(tasks.lifeSegmentId, lifeSegments.id))
      .where(and(...conds))
      .orderBy(
        asc(tasks.dueDate),
        desc(tasks.isImportant),
        asc(tasks.sortOrder),
        asc(tasks.createdAt)
      ),
    openBlockersByTask(userId),
  ]);
  return rows.map((r) => ({
    ...r.task,
    segment: r.segment,
    blockedBy: blockers.get(r.task.id) ?? [],
  }));
}

export async function getTask(userId: string, id: string): Promise<TaskRow | null> {
  const [[row], blockers] = await Promise.all([
    db
      .select({ task: tasks, segment: segmentRefColumns })
      .from(tasks)
      .innerJoin(lifeSegments, eq(tasks.lifeSegmentId, lifeSegments.id))
      .where(and(eq(tasks.userId, userId), eq(tasks.id, id), isNull(tasks.deletedAt)))
      .limit(1),
    openBlockersByTask(userId, id),
  ]);
  return row ? { ...row.task, segment: row.segment, blockedBy: blockers.get(id) ?? [] } : null;
}

export type BlockerOption = {
  id: string;
  title: string;
  dueDate: string | null;
  status: Task['status'];
};

/**
 * Tasks one task may wait on: every open task but itself, plus anything it
 * already waits on even if that is done, so editing never drops a link unseen.
 */
export async function listBlockerOptions(
  userId: string,
  forTaskId?: string
): Promise<BlockerOption[]> {
  const conds = [eq(tasks.userId, userId), isNull(tasks.deletedAt)];
  if (forTaskId) {
    const linked = db
      .select({ id: taskDependencies.dependsOnTaskId })
      .from(taskDependencies)
      .where(and(eq(taskDependencies.userId, userId), eq(taskDependencies.taskId, forTaskId)));
    conds.push(ne(tasks.id, forTaskId), or(ne(tasks.status, 'done'), inArray(tasks.id, linked))!);
  } else {
    conds.push(ne(tasks.status, 'done'));
  }
  return db
    .select({ id: tasks.id, title: tasks.title, dueDate: tasks.dueDate, status: tasks.status })
    .from(tasks)
    .where(and(...conds))
    .orderBy(asc(tasks.dueDate), asc(tasks.title));
}

/** Ids of every task this one waits on, open or done. */
export async function listDependencyIds(userId: string, taskId: string): Promise<string[]> {
  const rows = await db
    .select({ id: taskDependencies.dependsOnTaskId })
    .from(taskDependencies)
    .where(and(eq(taskDependencies.userId, userId), eq(taskDependencies.taskId, taskId)));
  return rows.map((r) => r.id);
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
