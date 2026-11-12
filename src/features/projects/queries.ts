import 'server-only';
import { and, asc, count, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { lifeSegments, milestones, projects, tasks } from '@/db/schema';
import { segmentRefColumns } from '@/features/life-segments/queries';
import type { SegmentRef } from '@/features/life-segments/types';

export type Project = typeof projects.$inferSelect;
export type ProjectRow = Project & {
  segment: SegmentRef;
  /** Computed on read: done → 100, else tasks, else milestones, else stored. */
  progress: number;
  taskTotal: number;
  taskDone: number;
  milestoneTotal: number;
  milestoneDone: number;
};

export type ProjectFilters = {
  lifeSegmentId?: string;
  /** Defaults to 'active' (planned, active, on_hold). */
  status?: 'active' | 'all';
};

export function computeProjectProgress(p: {
  status: string;
  progress: number;
  taskTotal: number;
  taskDone: number;
  milestoneTotal: number;
  milestoneDone: number;
}): number {
  if (p.status === 'done') return 100;
  if (p.taskTotal > 0) return Math.round((p.taskDone / p.taskTotal) * 100);
  if (p.milestoneTotal > 0) return Math.round((p.milestoneDone / p.milestoneTotal) * 100);
  return Math.max(0, Math.min(100, p.progress));
}

export async function listProjects(
  userId: string,
  filters: ProjectFilters = {}
): Promise<ProjectRow[]> {
  const conds = [eq(projects.userId, userId), isNull(projects.deletedAt)];
  if (filters.lifeSegmentId) conds.push(eq(projects.lifeSegmentId, filters.lifeSegmentId));
  if ((filters.status ?? 'active') === 'active') {
    conds.push(sql`${projects.status} not in ('done', 'archived')`);
  }
  const rows = await db
    .select({ project: projects, segment: segmentRefColumns })
    .from(projects)
    .innerJoin(lifeSegments, eq(projects.lifeSegmentId, lifeSegments.id))
    .where(and(...conds))
    .orderBy(asc(projects.dueDate), asc(projects.createdAt));

  const taskStats = await db
    .select({
      projectId: tasks.projectId,
      total: sql<number>`count(*)::int`,
      done: sql<number>`count(*) filter (where ${tasks.status} = 'done')::int`,
    })
    .from(tasks)
    .where(
      and(eq(tasks.userId, userId), isNull(tasks.deletedAt), sql`${tasks.projectId} is not null`)
    )
    .groupBy(tasks.projectId);
  const msStats = await db
    .select({
      projectId: milestones.projectId,
      total: sql<number>`count(*)::int`,
      done: sql<number>`count(${milestones.completedAt})::int`,
    })
    .from(milestones)
    .where(and(eq(milestones.userId, userId), sql`${milestones.projectId} is not null`))
    .groupBy(milestones.projectId);
  const ts = new Map(taskStats.map((t) => [t.projectId as string, t]));
  const ms = new Map(msStats.map((m) => [m.projectId as string, m]));

  return rows.map(({ project, segment }) => {
    const t = ts.get(project.id) ?? { total: 0, done: 0 };
    const m = ms.get(project.id) ?? { total: 0, done: 0 };
    const stats = {
      taskTotal: t.total,
      taskDone: t.done,
      milestoneTotal: m.total,
      milestoneDone: m.done,
    };
    return {
      ...project,
      segment,
      ...stats,
      progress: computeProjectProgress({ ...project, ...stats }),
    };
  });
}

export async function getProject(userId: string, id: string): Promise<ProjectRow | null> {
  const all = await listProjects(userId, { status: 'all' });
  return all.find((p) => p.id === id) ?? null;
}

export type ProjectOption = Pick<Project, 'id' | 'title' | 'lifeSegmentId'>;

/**
 * Lightweight list for pickers: every project still in play, the most used
 * first. Usage is the number of tasks ever filed under the project.
 */
export async function listProjectOptions(userId: string): Promise<ProjectOption[]> {
  const usage = db
    .select({ projectId: tasks.projectId, n: count().as('task_n') })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)))
    .groupBy(tasks.projectId)
    .as('usage');
  return db
    .select({ id: projects.id, title: projects.title, lifeSegmentId: projects.lifeSegmentId })
    .from(projects)
    .leftJoin(usage, eq(usage.projectId, projects.id))
    .where(
      and(
        eq(projects.userId, userId),
        isNull(projects.deletedAt),
        sql`${projects.status} not in ('done', 'archived')`
      )
    )
    .orderBy(sql`coalesce(${usage.n}, 0) desc`, asc(projects.title));
}
