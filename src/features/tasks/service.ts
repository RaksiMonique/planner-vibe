import 'server-only';
import { and, asc, eq, inArray, isNull, notInArray, sql } from 'drizzle-orm';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { db } from '@/db';
import {
  budgets,
  goalProjects,
  goals,
  lifeSegments,
  milestones,
  projects,
  taskDependencies,
  tasks,
  vehicleDocuments,
} from '@/db/schema';
import { pickLinkedGoal } from '@/features/goals/linked-goal';
import { documentStatus } from '@/features/vehicles/status';
import { saveEntry } from '@/features/journal/service';
import type { JournalEntry } from '@/features/journal/queries';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { findCycles } from './dependencies';
import type { Task } from './queries';
import { buildTaskRrule, dateKeyToUtc, nextOccurrence } from './recurrence';
import type { TaskInput, WriteItOutInput } from './schema';

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
  if (input.budgetId) {
    checks.push(
      db.$count(budgets, and(eq(budgets.id, input.budgetId), eq(budgets.userId, userId)))
    );
    labels.push('budget');
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

/**
 * The goal a task is filed under when none is chosen (instructions.md 5.3):
 * its milestone's goal, else the goal its project supports, the longest
 * horizon when the project supports several, none when it supports none.
 */
async function inheritedGoalId(userId: string, input: TaskInput): Promise<string | null> {
  if (input.goalId) return input.goalId;
  if (input.milestoneId) {
    const [m] = await db
      .select({ goalId: milestones.goalId })
      .from(milestones)
      .where(and(eq(milestones.id, input.milestoneId), eq(milestones.userId, userId)))
      .limit(1);
    if (m?.goalId) return m.goalId;
  }
  if (!input.projectId) return null;
  const linked = await db
    .select({ id: goals.id, horizon: goals.horizon })
    .from(goalProjects)
    .innerJoin(goals, eq(goals.id, goalProjects.goalId))
    .where(
      and(
        eq(goalProjects.projectId, input.projectId),
        eq(goalProjects.userId, userId),
        isNull(goals.deletedAt),
        notInArray(goals.status, ['achieved', 'abandoned'])
      )
    )
    .orderBy(asc(goals.createdAt));
  return pickLinkedGoal(linked)?.id ?? null;
}

function toValues(input: TaskInput, ctx: TaskContext) {
  const rrule = input.dueDate ? buildTaskRrule(input, input.dueDate) : null;
  return {
    title: input.title,
    notes: input.notes ?? null,
    lifeSegmentId: input.lifeSegmentId,
    projectId: input.projectId ?? null,
    goalId: input.goalId ?? null,
    milestoneId: input.milestoneId ?? null,
    budgetId: input.budgetId ?? null,
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

/**
 * Subtasks typed into the sheet, one per line: open tasks under the parent
 * in its segment, project, goal and milestone, with no date of their own.
 * A subtask cannot have subtasks, so a new subtask's own lines are ignored.
 */
async function createSubtasks(
  userId: string,
  parent: Task,
  titles: string[] = []
): Promise<Task[]> {
  if (titles.length === 0 || parent.parentTaskId) return [];
  return db
    .insert(tasks)
    .values(
      titles.map((title) => ({
        userId,
        title,
        lifeSegmentId: parent.lifeSegmentId,
        projectId: parent.projectId,
        goalId: parent.goalId,
        milestoneId: parent.milestoneId,
        budgetId: parent.budgetId,
        parentTaskId: parent.id,
        priority: parent.priority,
        status: 'todo' as const,
      }))
    )
    .returning();
}

export const STUCK_TITLE_PREFIX = 'Stuck on: ';
const STUCK_PROMPTS = {
  avoiding: 'What am I avoiding?',
  nextStep: 'What is the smallest next step?',
} as const;

/**
 * "Write it out" for a task that keeps rolling over (stuck.ts): the two
 * answers go into the journal as a reflection dated today, in the task's
 * segment and pointing back at the task; the smallest next step, when given,
 * becomes an open subtask so the task has somewhere to start. A subtask
 * cannot have subtasks, so for one of those only the entry is written.
 */
export async function writeItOut(
  userId: string,
  input: WriteItOutInput,
  ctx: TaskContext
): Promise<{ entry: JournalEntry; subtask: Task | null }> {
  const task = await getTaskOrThrow(userId, input.taskId);
  const content = (['avoiding', 'nextStep'] as const)
    .filter((k) => input[k])
    .map((k) => `${STUCK_PROMPTS[k]}\n${input[k]}`)
    .join('\n\n');
  const entry = await saveEntry(userId, {
    lifeSegmentId: task.lifeSegmentId,
    kind: 'reflection',
    date: ctx.todayKey,
    title: `${STUCK_TITLE_PREFIX}${task.title}`.slice(0, 160),
    content,
    taskId: task.id,
  });
  const [subtask] = input.nextStep ? await createSubtasks(userId, task, [input.nextStep]) : [];
  return { entry, subtask: subtask ?? null };
}

export async function createTask(
  userId: string,
  input: TaskInput,
  ctx: TaskContext
): Promise<Task> {
  await assertOwned(userId, input);
  await assertBlockers(userId, input.blockedByIds);
  const goalId = await inheritedGoalId(userId, input);
  const [row] = await db
    .insert(tasks)
    .values({
      ...toValues(input, ctx),
      goalId,
      userId,
      completedAt: input.status === 'done' ? new Date() : null,
    })
    .returning();
  await syncBlockers(userId, row.id, input.blockedByIds);
  await createSubtasks(userId, row, input.subtaskTitles);
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
  // A goal is inherited again only when the project or milestone changes;
  // clearing the goal on its own is respected.
  const linksChanged =
    (input.projectId ?? null) !== current.projectId ||
    (input.milestoneId ?? null) !== current.milestoneId;
  const goalId = linksChanged ? await inheritedGoalId(userId, input) : (input.goalId ?? null);
  const [row] = await db
    .update(tasks)
    .set({
      ...toValues(input, ctx),
      goalId,
      completedAt: nowDone ? (current.completedAt ?? new Date()) : null,
    })
    .where(and(eq(tasks.userId, userId), eq(tasks.id, id)))
    .returning();
  await syncBlockers(userId, id, input.blockedByIds);
  await createSubtasks(userId, row, input.subtaskTitles);
  if (nowDone && !wasDone) await spawnNextOccurrence(userId, row, ctx);
  return row;
}

export const RENEWAL_NOT_DONE =
  'Enter the new expiry date on the Vehicles page first. This task closes itself once the paper is more than three months from running out.';

/**
 * A task that renews a vehicle paper (8.24) is done when the paper is, not
 * when it is ticked: it stays open until the document carries a date more
 * than three months away. A paper that no longer exists frees the task.
 */
async function assertRenewalDone(userId: string, task: Task, todayKey: string) {
  if (!task.vehicleDocumentId) return;
  const [doc] = await db
    .select({ expiresOn: vehicleDocuments.expiresOn })
    .from(vehicleDocuments)
    .where(
      and(eq(vehicleDocuments.userId, userId), eq(vehicleDocuments.id, task.vehicleDocumentId))
    )
    .limit(1);
  if (doc && documentStatus(doc.expiresOn, todayKey).state !== 'ok') {
    throw new ValidationError(RENEWAL_NOT_DONE);
  }
}

/** Marks done and, for a repeating task, creates the next occurrence (instructions.md 5.4). */
export async function completeTask(userId: string, id: string, ctx: TaskContext): Promise<Task> {
  const current = await getTaskOrThrow(userId, id);
  if (current.status === 'done') return current;
  await assertRenewalDone(userId, current, ctx.todayKey);
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
    budgetId: task.budgetId,
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
