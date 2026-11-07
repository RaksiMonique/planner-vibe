import 'server-only';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { goals, milestones, projects } from '@/db/schema';
import { NotFoundError } from '@/lib/errors';
import type { MilestoneInput } from './schema';

export type Milestone = typeof milestones.$inferSelect;

async function assertGoal(userId: string, goalId: string) {
  const [row] = await db
    .select({ id: goals.id })
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.id, goalId), isNull(goals.deletedAt)))
    .limit(1);
  if (!row) throw new NotFoundError('That goal does not exist.');
}

async function assertProject(userId: string, projectId: string) {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);
  if (!row) throw new NotFoundError('That project does not exist.');
}

export async function createMilestone(userId: string, input: MilestoneInput): Promise<Milestone> {
  if (input.goalId) await assertGoal(userId, input.goalId);
  if (input.projectId) await assertProject(userId, input.projectId);
  const owner = input.goalId
    ? eq(milestones.goalId, input.goalId)
    : eq(milestones.projectId, input.projectId!);
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${milestones.sortOrder}), -1) + 1` })
    .from(milestones)
    .where(and(eq(milestones.userId, userId), owner));
  const [row] = await db
    .insert(milestones)
    .values({
      userId,
      title: input.title,
      dueDate: input.dueDate ?? null,
      goalId: input.goalId ?? null,
      projectId: input.projectId ?? null,
      sortOrder: Number(next),
    })
    .returning();
  return row;
}

export async function toggleMilestone(userId: string, id: string): Promise<Milestone> {
  const [row] = await db
    .select()
    .from(milestones)
    .where(and(eq(milestones.userId, userId), eq(milestones.id, id)))
    .limit(1);
  if (!row) throw new NotFoundError('That milestone does not exist.');
  const [updated] = await db
    .update(milestones)
    .set({ completedAt: row.completedAt ? null : new Date() })
    .where(and(eq(milestones.userId, userId), eq(milestones.id, id)))
    .returning();
  return updated;
}

export async function removeMilestone(userId: string, id: string): Promise<void> {
  await db.delete(milestones).where(and(eq(milestones.userId, userId), eq(milestones.id, id)));
}
