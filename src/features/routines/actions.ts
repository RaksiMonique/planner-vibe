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
import { requireUser } from '@/lib/auth';
import { dateKeyValue, routineInput } from './schema';
import {
  createRoutine,
  duplicateRoutine,
  removeRoutine,
  setStepDone,
  updateRoutine,
} from './service';

/** Routines show on the dashboard and the weekly and monthly views too. */
function refresh() {
  revalidatePath('/', 'layout');
}

const withId = z.object({ id: z.uuid() });

export async function createRoutineAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = routineInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await createRoutine(user.id, parsed.data);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function updateRoutineAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const values = formValues(formData);
    const id = withId.safeParse(values);
    if (!id.success) return fromZodError(id.error);
    const parsed = routineInput.safeParse(values);
    if (!parsed.success) return fromZodError(parsed.error);
    await updateRoutine(user.id, id.data.id, parsed.data);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function deleteRoutineAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeRoutine(user.id, parsed.data.id);
  refresh();
}

export async function saveAsTemplateAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await duplicateRoutine(user.id, parsed.data.id, { asTemplate: true });
  refresh();
}

export async function createFromTemplateAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await duplicateRoutine(user.id, parsed.data.id, { asTemplate: false });
  refresh();
}

/**
 * Contract used by the weekly view and the dashboard: marks one step of a
 * routine done or not for a date, keeping linked habit check-ins in step.
 */
export async function toggleRoutineStep(
  routineId: string,
  stepId: string,
  dateKey: string,
  done: boolean
): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();
    const parsed = z
      .object({ routineId: z.uuid(), stepId: z.uuid(), dateKey: dateKeyValue })
      .safeParse({ routineId, stepId, dateKey });
    if (!parsed.success) return fail('That step is not valid.');
    await setStepDone(user.id, routineId, stepId, dateKey, done);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}
