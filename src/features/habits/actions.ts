'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  fail,
  formValues,
  fromError,
  fromZodError,
  ok,
  type ActionResult,
} from '@/lib/action-result';
import { getPreferences } from '@/features/settings/service';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone } from '@/lib/dates';
import { dateKeyValue, habitInput, planItemInput } from './schema';
import {
  addPlanItem,
  checkIn,
  createHabit,
  movePlanItem,
  removeHabit,
  removePlanItem,
  setHabitArchived,
  setPlanItemDone,
  uncheck,
  updateHabit,
} from './service';

/** Habits show on the dashboard, the weekly and monthly views and in routines. */
function refresh() {
  revalidatePath('/', 'layout');
}

const withId = z.object({ id: z.uuid() });

export async function createHabitAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const parsed = habitInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const habit = await createHabit(user.id, parsed.data);
    refresh();
    return ok({ id: habit.id });
  } catch (e) {
    return fromError(e);
  }
}

export async function updateHabitAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const values = formValues(formData);
    const id = withId.safeParse(values);
    if (!id.success) return fromZodError(id.error);
    const parsed = habitInput.safeParse(values);
    if (!parsed.success) return fromZodError(parsed.error);
    await updateHabit(user.id, id.data.id, parsed.data);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function setHabitArchivedAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.extend({ archived: z.coerce.boolean() }).safeParse(formValues(formData));
  if (!parsed.success) return;
  await setHabitArchived(user.id, parsed.data.id, parsed.data.archived);
  refresh();
}

export async function deleteHabitAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeHabit(user.id, parsed.data.id);
  refresh();
}

/**
 * Contract used by the weekly view, the routines feature and the dashboard:
 * records or removes the check-in for one date.
 */
export async function toggleHabitCheckIn(
  habitId: string,
  dateKey: string,
  done: boolean
): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();
    const parsed = z
      .object({ habitId: z.uuid(), dateKey: dateKeyValue })
      .safeParse({ habitId, dateKey });
    if (!parsed.success) return fail('That check-in is not valid.');
    if (done) await checkIn(user.id, habitId, dateKey);
    else await uncheck(user.id, habitId, dateKey);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

// ── Plan items ──

export async function addPlanItemAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = planItemInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await addPlanItem(user.id, parsed.data);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function setPlanItemDoneAction(id: string, done: boolean): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!z.uuid().safeParse(id).success) return fail('That plan item is not valid.');
    const prefs = await getPreferences(user.id);
    await setPlanItemDone(user.id, id, done, toDateKey(todayInZone(prefs.timeZone)));
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function movePlanItemAction(
  id: string,
  direction: 'up' | 'down'
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!z.uuid().safeParse(id).success) return fail('That plan item is not valid.');
    await movePlanItem(user.id, id, direction);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function deletePlanItemAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!z.uuid().safeParse(id).success) return fail('That plan item is not valid.');
    await removePlanItem(user.id, id);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}
