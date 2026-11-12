import 'server-only';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { db } from '@/db';
import { goals, lifeSegments, milestones, projects, taskDependencies, tasks } from '@/db/schema';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { findCycles } from './dependencies';
import type { Task } from './queries';
import { dateKeyToUtc, nextOccurrence, presetToRrule } from './recurrence';
import type { TaskInput } from './schema';

export type TaskContext = { timeZone: string; todayKey: string };

export async function getTaskOrThrow(userId: string, id: string): Promise<Task> {
  const [row] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.id, id), isNull(tasks.deletedAt)))
    .limit(1);
  if (!row) throw new NotFoundError('That task does not exist.');
  return row;
}

/** Foreign keys only prove a row exists; these prove it belongs to the user. */
async function assertOwned(userId: string, input: TaskInput, selfId?: string) {
  const checks: Array<Promise<number>> = [
    db.$count(
      lifeSegments,
      and(eq(lifeSegments.id, input.lifeSegmentId), eq(lifeSegments.userId, userId))
    ),
  ];
  const labels = ['Life Segment'];
  if (input.projectId) {
    checks.push(
      db.$count(projects, and(eq(projects.id, input.projectId), eq(projects.userId, userId)))
    );
    labels.push('project');
  }
  if (input.goalId) {
    checks.push(db.$count(goals, and(eq(goals.id, input.goalId), eq(goals.userId, userId))));
    labels.push('goal');
  }
  if (input.milestoneId) {
    checks.push(
      db.$count(
        milestones,
        and(eq(milestones.id, input.milestoneId), eq(milestones.userId, userId))
      )
    );
    labels.push('milestone');
  }
  if (input.parentTaskId) {
    if (input.parentTaskId === selfId)
      throw new ValidationError('A task cannot be its own parent.');
    checks.push(db.$count(tasks, and(eq(tasks.id, input.parentTaskId), eq(tasks.userId, userId))));
    labels.push('parent task');
  }
  const counts = await Promise.all(checks);
  counts.forEach((c, i) => {
    if (c === 0) throw new ValidationError(`That ${labels[i]} does not exist.`);
  });
}

/** The tasks this one waits on must be the user's, not itself, and not already waiting on it. */
async function assertBlockers(userId: string, blockerIds: string[], selfId?: string) {
  if (blockerIds.length === 0) return;
  if (selfId && blockerIds.includes(selfId))
    throw new ValidationError('A task cannot wait on itself.');
  const owned = await db.$count(
    tasks,
    and(eq(tasks.userId, userId), isNull(tasks.deletedAt), inArray(tasks.id, blockerIds))
  );
  if (owned !== new Set(blockerIds).size)
    throw new ValidationError('One of the tasks to wait on does not exist.');
  if (selfId) {
    const edges = await db
      .select({
        taskId: taskDependencies.taskId,
        dependsOnTaskId: taskDependencies.dependsOnTaskId,
      })
      .from(taskDependencies)
      .where(eq(taskDependencies.userId, userId));
    if (findCycles(selfId, blockerIds, edges).length > 0)
      throw new ValidationError('Those tasks already wait on this one, so it cannot wait on them.');
  }
}

/** Makes the task's "blocked by" links match `blockerIds` exactly. */
async function syncBlockers(userId: string, taskId: string, blockerIds: string[]) {
  const wanted = new Set(blockerIds);
  const current = await db
    .select({ id: taskDependencies.dependsOnTaskId })
    .from(taskDependencies)
    .where(and(eq(taskDependencies.userId, userId), eq(taskDependencies.taskId, taskId)));
  const have = new Set(current.map((r) => r.id));
  const toRemove = [...have].filter((id) => !wanted.has(id));
  const toAdd = [...wanted].filter((id) => !have.has(id));
  if (toRemove.length > 0) {
    await db
      .delete(taskDependencies)
      .where(
        and(
          eq(taskDependencies.userId, userId),
          eq(taskDependencies.taskId, taskId),
          inArray(taskDependencies.dependsOnTaskId, toRemove)
        )
      );
  }
  if (toAdd.length > 0) {
    await db
      .insert(taskDependencies)
      .values(toAdd.map((dependsOnTaskId) => ({ userId, taskId, dependsOnTaskId })))
      .onConflictDoNothing();
  }
}

function toDueAt(dueDate: string | undefined, dueTime: string | undefined, timeZone: string) {
  if (!dueDate || !dueTime) return null;
  return fromZonedTime(`${dueDate}T${dueTime}:00`, timeZone);
}

function toValues(input: TaskInput, ctx: TaskContext) {
  const rrule = input.dueDate ? presetToRrule(input.recurrence, input.dueDate) : null;
  return {
    title: input.title,
    notes: input.notes ?? null,
    lifeSegmentId: input.lifeSegmentId,
    projectId: input.projectId ?? null,
    goalId: input.goalId ?? null,
    milestoneId: input.milestoneId ?? null,
    parentTaskId: input.parentTaskId ?? null,
    priority: input.priority,
    isImportant: input.isImportant,
    status: input.status,
    dueDate: input.dueDate ?? null,
    dueAt: toDueAt(input.dueDate, input.dueTime, ctx.timeZone),
    rrule,
    dtstart: rrule && input.dueDate ? dateKeyToUtc(input.dueDate) : null,
  };
}

export async function createTask(
  userId: string,
  input: TaskInput,
  ctx: TaskContext
): Promise<Task> {
  await assertOwned(userId, input);
  await assertBlockers(userId, input.blockedByIds);
  const [row] = await db
    .insert(tasks)
    .values({
      ...toValues(input, ctx),
      userId,
      completedAt: input.status === 'done' ? new Date() : null,
    })
    .returning();
  await syncBlockers(userId, row.id, input.blockedByIds);
  return row;
}

export async function updateTask(
  userId: string,
  id: string,
  input: TaskInput,
  ctx: TaskContext
): Promise<Task> {
  const current = await getTaskOrThrow(userId, id);
  await assertOwned(userId, input, id);
  await assertBlockers(userId, input.blockedByIds, id);
  const wasDone = current.status === 'done';
  const nowDone = input.status === 'done';
  const [row] = await db
    .update(tasks)
    .set({
      ...toValues(input, ctx),
      completedAt: nowDone ? (current.completedAt ?? new Date()) : null,
    })
    .where(and(eq(tasks.userId, userId), eq(tasks.id, id)))
    .returning();
  await syncBlockers(userId, id, input.blockedByIds);
  if (nowDone && !wasDone) await spawnNextOccurrence(userId, row, ctx);
  return row;
}

/** Marks done and, for a repeating task, creates the next occurrence (instructions.md 5.4). */
export async function completeTask(userId: string, id: string, ctx: TaskContext): Promise<Task> {
  const current = await getTaskOrThrow(userId, id);
  if (current.status === 'done') return current;
  const [row] = await db
    .update(tasks)
    .set({ status: 'done', completedAt: new Date() })
    .where(and(eq(tasks.userId, userId), eq(tasks.id, id)))
    .returning();
  await spawnNextOccurrence(userId, row, ctx);
  return row;
}

export async function uncompleteTask(userId: string, id: string): Promise<Task> {
  await getTaskOrThrow(userId, id);
  const [row] = await db
    .update(tasks)
    .set({ status: 'todo', completedAt: null })
    .where(and(eq(tasks.userId, userId), eq(tasks.id, id)))
    .returning();
  return row;
}

export async function setTaskStatus(
  userId: string,
  id: string,
  status: Task['status'],
  ctx: TaskContext
): Promise<Task> {
  if (status === 'done') return completeTask(userId, id, ctx);
  await getTaskOrThrow(userId, id);
  const [row] = await db
    .update(tasks)
    .set({ status, completedAt: null })
    .where(and(eq(tasks.userId, userId), eq(tasks.id, id)))
    .returning();
  return row;
}

/** Soft delete; subtasks go with their parent. */
export async function removeTask(userId: string, id: string): Promise<void> {
  await getTaskOrThrow(userId, id);
  const now = new Date();
  await db
    .update(tasks)
    .set({ deletedAt: now })
    .where(
      and(eq(tasks.userId, userId), sql`(${tasks.id} = ${id} or ${tasks.parentTaskId} = ${id})`)
    );
}

async function spawnNextOccurrence(userId: string, task: Task, ctx: TaskContext) {
  if (!task.rrule || !task.dueDate) return;
  const next = nextOccurrence(task.rrule, task.dueDate);
  if (!next) return;
  const rootId = task.recurrenceParentId ?? task.id;
  const existing = await db.$count(
    tasks,
    and(
      eq(tasks.userId, userId),
      isNull(tasks.deletedAt),
      eq(tasks.dueDate, next),
      sql`(${tasks.recurrenceParentId} = ${rootId} or ${tasks.id} = ${rootId})`
    )
  );
  if (existing > 0) return;
  let dueAt: Date | null = null;
  if (task.dueAt) {
    const local = toZonedTime(task.dueAt, ctx.timeZone);
    const hh = String(local.getHours()).padStart(2, '0');
    const mm = String(local.getMinutes()).padStart(2, '0');
    dueAt = fromZonedTime(`${next}T${hh}:${mm}:00`, ctx.timeZone);
  }
  await db.insert(tasks).values({
    userId,
    lifeSegmentId: task.lifeSegmentId,
    projectId: task.projectId,
    goalId: task.goalId,
    milestoneId: task.milestoneId,
    parentTaskId: task.parentTaskId,
    title: task.title,
    notes: task.notes,
    priority: task.priority,
    isImportant: task.isImportant,
    status: 'todo',
    dueDate: next,
    dueAt,
    rrule: task.rrule,
    dtstart: task.dtstart,
    exdates: task.exdates,
    occurrenceDate: next,
    recurrenceParentId: rootId,
    sortOrder: task.sortOrder,
  });
}
