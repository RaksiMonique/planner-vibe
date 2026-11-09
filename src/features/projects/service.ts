import 'server-only';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { goalProjects, goals, projects } from '@/db/schema';
import { getSegmentById } from '@/features/life-segments/service';
import { NotFoundError } from '@/lib/errors';
import type { ProjectInput } from './schema';

export type Project = typeof projects.$inferSelect;

export async function requireProject(userId: string, id: string): Promise<Project> {
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.id, id), isNull(projects.deletedAt)))
    .limit(1);
  if (!row) throw new NotFoundError('That project does not exist.');
  return row;
}

async function assertGoals(userId: string, goalIds: string[]) {
  if (goalIds.length === 0) return;
  const rows = await db
    .select({ id: goals.id })
    .from(goals)
    .where(and(eq(goals.userId, userId), isNull(goals.deletedAt), inArray(goals.id, goalIds)));
  if (rows.length !== new Set(goalIds).size)
    throw new NotFoundError('One of those goals does not exist.');
}

async function syncGoalLinks(userId: string, projectId: string, goalIds: string[]) {
  const wanted = new Set(goalIds);
  const current = await db
    .select({ goalId: goalProjects.goalId })
    .from(goalProjects)
    .where(and(eq(goalProjects.userId, userId), eq(goalProjects.projectId, projectId)));
  const have = new Set(current.map((r) => r.goalId));
  const toRemove = [...have].filter((g) => !wanted.has(g));
  const toAdd = [...wanted].filter((g) => !have.has(g));
  if (toRemove.length > 0) {
    await db
      .delete(goalProjects)
      .where(
        and(
          eq(goalProjects.userId, userId),
          eq(goalProjects.projectId, projectId),
          inArray(goalProjects.goalId, toRemove)
        )
      );
  }
  if (toAdd.length > 0) {
    await db
      .insert(goalProjects)
      .values(toAdd.map((goalId) => ({ userId, projectId, goalId })))
      .onConflictDoNothing();
  }
}

function toRow(input: ProjectInput) {
  return {
    title: input.title,
    lifeSegmentId: input.lifeSegmentId,
    status: input.status,
    startDate: input.startDate ?? null,
    dueDate: input.dueDate ?? null,
    description: input.description ?? null,
  };
}

export async function createProject(userId: string, input: ProjectInput): Promise<Project> {
  await getSegmentById(userId, input.lifeSegmentId);
  await assertGoals(userId, input.goalIds);
  const [row] = await db
    .insert(projects)
    .values({ ...toRow(input), userId })
    .returning();
  await syncGoalLinks(userId, row.id, input.goalIds);
  return row;
}

export async function updateProject(
  userId: string,
  id: string,
  input: ProjectInput
): Promise<Project> {
  await requireProject(userId, id);
  await getSegmentById(userId, input.lifeSegmentId);
  await assertGoals(userId, input.goalIds);
  const [row] = await db
    .update(projects)
    .set(toRow(input))
    .where(and(eq(projects.userId, userId), eq(projects.id, id)))
    .returning();
  await syncGoalLinks(userId, id, input.goalIds);
  return row;
}

/** Soft delete. Tasks keep their project id and stay visible in Tasks. */
export async function deleteProject(userId: string, id: string): Promise<void> {
  await requireProject(userId, id);
  await db
    .update(projects)
    .set({ deletedAt: new Date() })
    .where(and(eq(projects.userId, userId), eq(projects.id, id)));
}
