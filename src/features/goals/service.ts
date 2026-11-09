import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { goalProjects, goals, projects } from '@/db/schema';
import { getSegmentById } from '@/features/life-segments/service';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { canBeChildOf, type Horizon } from './progress';
import type { GoalInput } from './schema';

export type Goal = typeof goals.$inferSelect;

async function findGoal(userId: string, id: string): Promise<Goal | null> {
  const [row] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.id, id), isNull(goals.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function requireGoal(userId: string, id: string): Promise<Goal> {
  const goal = await findGoal(userId, id);
  if (!goal) throw new NotFoundError('That goal does not exist.');
  return goal;
}

/** The parent must be the user's, sit at a longer horizon, and not descend from the child. */
async function assertParent(
  userId: string,
  parentId: string,
  childHorizon: Horizon,
  childId?: string
) {
  if (childId && parentId === childId)
    throw new ValidationError('A goal cannot be its own parent.');
  const parent = await findGoal(userId, parentId);
  if (!parent) throw new NotFoundError('That parent goal does not exist.');
  if (!canBeChildOf(childHorizon, parent.horizon)) {
    throw new ValidationError('A goal can only sit under a goal with a longer horizon.');
  }
  if (childId) {
    let cursor: Goal | null = parent;
    const seen = new Set<string>();
    while (cursor?.parentGoalId && !seen.has(cursor.id)) {
      seen.add(cursor.id);
      if (cursor.parentGoalId === childId) {
        throw new ValidationError('That goal already sits below this one.');
      }
      cursor = await findGoal(userId, cursor.parentGoalId);
    }
  }
}

function toRow(input: GoalInput) {
  return {
    title: input.title,
    lifeSegmentId: input.lifeSegmentId,
    horizon: input.horizon,
    parentGoalId: input.parentGoalId ?? null,
    targetDate: input.targetDate ?? null,
    status: input.status,
    targetValue: input.targetValue === undefined ? null : String(input.targetValue),
    currentValue: input.currentValue === undefined ? null : String(input.currentValue),
    unit: input.unit ?? null,
    description: input.description ?? null,
  };
}

export async function createGoal(userId: string, input: GoalInput): Promise<Goal> {
  await getSegmentById(userId, input.lifeSegmentId);
  if (input.parentGoalId) await assertParent(userId, input.parentGoalId, input.horizon);
  const [row] = await db
    .insert(goals)
    .values({ ...toRow(input), userId })
    .returning();
  return row;
}

export async function updateGoal(userId: string, id: string, input: GoalInput): Promise<Goal> {
  await requireGoal(userId, id);
  await getSegmentById(userId, input.lifeSegmentId);
  if (input.parentGoalId) await assertParent(userId, input.parentGoalId, input.horizon, id);
  const [row] = await db
    .update(goals)
    .set(toRow(input))
    .where(and(eq(goals.userId, userId), eq(goals.id, id)))
    .returning();
  return row;
}

/** Soft delete. Children become top-level goals so they stay reachable. */
export async function deleteGoal(userId: string, id: string): Promise<void> {
  await requireGoal(userId, id);
  await db
    .update(goals)
    .set({ parentGoalId: null })
    .where(and(eq(goals.userId, userId), eq(goals.parentGoalId, id)));
  await db
    .update(goals)
    .set({ deletedAt: new Date() })
    .where(and(eq(goals.userId, userId), eq(goals.id, id)));
}

async function requireProject(userId: string, projectId: string) {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);
  if (!row) throw new NotFoundError('That project does not exist.');
}

export async function linkProject(
  userId: string,
  goalId: string,
  projectId: string
): Promise<void> {
  await requireGoal(userId, goalId);
  await requireProject(userId, projectId);
  await db.insert(goalProjects).values({ userId, goalId, projectId }).onConflictDoNothing();
}

export async function unlinkProject(
  userId: string,
  goalId: string,
  projectId: string
): Promise<void> {
  await db
    .delete(goalProjects)
    .where(
      and(
        eq(goalProjects.userId, userId),
        eq(goalProjects.goalId, goalId),
        eq(goalProjects.projectId, projectId)
      )
    );
}

export async function listLinkedProjectIds(userId: string, goalId: string): Promise<string[]> {
  const rows = await db
    .select({ projectId: goalProjects.projectId })
    .from(goalProjects)
    .where(and(eq(goalProjects.userId, userId), eq(goalProjects.goalId, goalId)));
  return rows.map((r) => r.projectId);
}

export async function listLinkedGoalIds(userId: string, projectId: string): Promise<string[]> {
  const rows = await db
    .select({ goalId: goalProjects.goalId })
    .from(goalProjects)
    .where(and(eq(goalProjects.userId, userId), eq(goalProjects.projectId, projectId)));
  return rows.map((r) => r.goalId);
}
