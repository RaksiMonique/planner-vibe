import 'server-only';
import { and, asc, count, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { goalProjects, goals, lifeSegments, milestones, tasks } from '@/db/schema';
import { segmentRefColumns } from '@/features/life-segments/queries';
import type { SegmentRef } from '@/features/life-segments/types';
import { computeGoalProgress, type Horizon } from './progress';

export type Goal = typeof goals.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type GoalRow = Omit<Goal, 'progress'> & {
  segment: SegmentRef;
  /** Computed on read, see progress.ts; null when nothing measures the goal yet. */
  progress: number | null;
  childCount: number;
  milestoneTotal: number;
  milestoneDone: number;
};

export type GoalFilters = {
  lifeSegmentId?: string;
  horizon?: Horizon;
  /** `null` returns top-level goals only. */
  parentGoalId?: string | null;
  /** Defaults to 'active' (planned, active, on_hold). */
  status?: 'active' | 'all';
};

/**
 * Loads every goal of the user once, computes progress for the whole tree,
 * then applies the filters. Fine for one person's goals.
 */
export async function listGoals(userId: string, filters: GoalFilters = {}): Promise<GoalRow[]> {
  const rows = await db
    .select({ goal: goals, segment: segmentRefColumns })
    .from(goals)
    .innerJoin(lifeSegments, eq(goals.lifeSegmentId, lifeSegments.id))
    .where(and(eq(goals.userId, userId), isNull(goals.deletedAt)))
    .orderBy(asc(goals.targetDate), asc(goals.createdAt));

  const msStats = await db
    .select({
      goalId: milestones.goalId,
      total: sql<number>`count(*)::int`,
      done: sql<number>`count(${milestones.completedAt})::int`,
    })
    .from(milestones)
    .where(and(eq(milestones.userId, userId), sql`${milestones.goalId} is not null`))
    .groupBy(milestones.goalId);
  const ms = new Map(msStats.map((m) => [m.goalId as string, { total: m.total, done: m.done }]));

  const children = new Map<string, Goal[]>();
  for (const { goal } of rows) {
    if (goal.parentGoalId) {
      const list = children.get(goal.parentGoalId) ?? [];
      list.push(goal);
      children.set(goal.parentGoalId, list);
    }
  }
  const memo = new Map<string, number | null>();
  const progressOf = (goal: Goal): number | null => {
    const cached = memo.get(goal.id);
    if (cached !== undefined) return cached;
    const kids = children.get(goal.id) ?? [];
    const value = computeGoalProgress(
      goal,
      kids.map(progressOf),
      ms.get(goal.id) ?? { total: 0, done: 0 }
    );
    memo.set(goal.id, value);
    return value;
  };

  const all: GoalRow[] = rows.map(({ goal, segment }) => {
    const stats = ms.get(goal.id) ?? { total: 0, done: 0 };
    return {
      ...goal,
      segment,
      progress: progressOf(goal),
      childCount: children.get(goal.id)?.length ?? 0,
      milestoneTotal: stats.total,
      milestoneDone: stats.done,
    };
  });

  const status = filters.status ?? 'active';
  return all.filter((g) => {
    if (filters.lifeSegmentId && g.lifeSegmentId !== filters.lifeSegmentId) return false;
    if (filters.horizon && g.horizon !== filters.horizon) return false;
    if (filters.parentGoalId === null && g.parentGoalId !== null) return false;
    if (filters.parentGoalId && g.parentGoalId !== filters.parentGoalId) return false;
    if (status === 'active' && (g.status === 'achieved' || g.status === 'abandoned')) return false;
    return true;
  });
}

export async function getGoal(userId: string, id: string): Promise<GoalRow | null> {
  const all = await listGoals(userId, { status: 'all' });
  return all.find((g) => g.id === id) ?? null;
}

export type GoalOption = Pick<Goal, 'id' | 'title' | 'horizon' | 'lifeSegmentId' | 'parentGoalId'>;

/**
 * Lightweight list for pickers: every goal that is not achieved or abandoned,
 * the most used first. Usage is the number of tasks and projects linked to it.
 */
export async function listGoalOptions(userId: string): Promise<GoalOption[]> {
  const taskUse = db
    .select({ goalId: tasks.goalId, n: count().as('task_n') })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)))
    .groupBy(tasks.goalId)
    .as('task_use');
  const projectUse = db
    .select({ goalId: goalProjects.goalId, n: count().as('project_n') })
    .from(goalProjects)
    .where(eq(goalProjects.userId, userId))
    .groupBy(goalProjects.goalId)
    .as('project_use');
  return db
    .select({
      id: goals.id,
      title: goals.title,
      horizon: goals.horizon,
      lifeSegmentId: goals.lifeSegmentId,
      parentGoalId: goals.parentGoalId,
    })
    .from(goals)
    .leftJoin(taskUse, eq(taskUse.goalId, goals.id))
    .leftJoin(projectUse, eq(projectUse.goalId, goals.id))
    .where(
      and(
        eq(goals.userId, userId),
        isNull(goals.deletedAt),
        sql`${goals.status} not in ('achieved', 'abandoned')`
      )
    )
    .orderBy(
      sql`coalesce(${taskUse.n}, 0) + coalesce(${projectUse.n}, 0) desc`,
      asc(goals.horizon),
      asc(goals.title)
    );
}

export type MilestoneFilters = {
  goalId?: string;
  projectId?: string;
  /** yyyy-MM-dd, inclusive. */
  dueFrom?: string;
  dueTo?: string;
  open?: boolean;
};

export async function listMilestones(
  userId: string,
  filters: MilestoneFilters = {}
): Promise<Milestone[]> {
  const conds = [eq(milestones.userId, userId)];
  if (filters.goalId) conds.push(eq(milestones.goalId, filters.goalId));
  if (filters.projectId) conds.push(eq(milestones.projectId, filters.projectId));
  if (filters.dueFrom) conds.push(gte(milestones.dueDate, filters.dueFrom));
  if (filters.dueTo) conds.push(lte(milestones.dueDate, filters.dueTo));
  if (filters.open) conds.push(isNull(milestones.completedAt));
  return db
    .select()
    .from(milestones)
    .where(and(...conds))
    .orderBy(asc(milestones.sortOrder), asc(milestones.dueDate), asc(milestones.createdAt));
}
