'use server';

import { revalidatePath } from 'next/cache';
import { clearReminder, syncReminder } from '@/features/reminders/service';
import { getPreferences } from '@/features/settings/service';
import { requireUser } from '@/lib/auth';
import {
  fail,
  formValues,
  fromError,
  fromZodError,
  ok,
  type ActionResult,
} from '@/lib/action-result';
import { toDateKey, todayInZone } from '@/lib/dates';
import { taskInput, taskStatusValue } from './schema';
import {
  completeTask,
  createTask,
  removeTask,
  setTaskStatus,
  uncompleteTask,
  updateTask,
  type TaskContext,
} from './service';

async function context(userId: string): Promise<TaskContext> {
  const prefs = await getPreferences(userId);
  return { timeZone: prefs.timeZone, todayKey: toDateKey(todayInZone(prefs.timeZone)) };
}

function refresh() {
  // Tasks appear on the dashboard, segment, project and goal pages too.
  revalidatePath('/', 'layout');
}

export type TaskFormState = ActionResult<{ id: string }> | undefined;

export async function createTaskAction(
  _prev: TaskFormState,
  formData: FormData
): Promise<TaskFormState> {
  try {
    const user = await requireUser();
    const parsed = taskInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const ctx = await context(user.id);
    const task = await createTask(user.id, parsed.data, ctx);
    await syncReminder(
      user.id,
      'task',
      task.id,
      { reminder: parsed.data.reminder, reminderAt: parsed.data.reminderAt },
      { dueAt: task.dueAt, dueDateKey: task.dueDate, timeZone: ctx.timeZone }
    );
    refresh();
    return ok({ id: task.id });
  } catch (e) {
    return fromError(e);
  }
}

export async function updateTaskAction(
  _prev: TaskFormState,
  formData: FormData
): Promise<TaskFormState> {
  try {
    const user = await requireUser();
    const id = formData.get('id');
    if (typeof id !== 'string' || !id) return fail('Which task?');
    const parsed = taskInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const ctx = await context(user.id);
    const task = await updateTask(user.id, id, parsed.data, ctx);
    await syncReminder(
      user.id,
      'task',
      task.id,
      { reminder: parsed.data.reminder, reminderAt: parsed.data.reminderAt },
      { dueAt: task.dueAt, dueDateKey: task.dueDate, timeZone: ctx.timeZone }
    );
    refresh();
    return ok({ id: task.id });
  } catch (e) {
    return fromError(e);
  }
}

export async function toggleTaskDoneAction(
  id: string,
  done: boolean
): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();
    if (done) await completeTask(user.id, id, await context(user.id));
    else await uncompleteTask(user.id, id);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function setTaskStatusAction(
  id: string,
  status: string
): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();
    const parsed = taskStatusValue.safeParse(status);
    if (!parsed.success) return fail('Unknown status.');
    await setTaskStatus(user.id, id, parsed.data, await context(user.id));
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function deleteTaskAction(id: string): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();
    await removeTask(user.id, id);
    await clearReminder(user.id, 'task', id);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}
