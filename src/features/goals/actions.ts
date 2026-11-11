'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { formValues, fromError, fromZodError, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/auth';
import { goalInput } from './schema';
import { createGoal, deleteGoal, linkProject, unlinkProject, updateGoal } from './service';

function revalidateGoals() {
  revalidatePath('/goals', 'layout');
  revalidatePath('/projects', 'layout');
  revalidatePath('/segments', 'layout');
  revalidatePath('/dashboard');
  revalidatePath('/lifelong');
  revalidatePath('/quarter');
  revalidatePath('/year');
}

export async function createGoalAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = goalInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await createGoal(user.id, parsed.data);
    revalidateGoals();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

const withId = z.object({ id: z.uuid() });

export async function updateGoalAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const values = formValues(formData);
    const id = withId.safeParse(values);
    if (!id.success) return fromZodError(id.error);
    const parsed = goalInput.safeParse(values);
    if (!parsed.success) return fromZodError(parsed.error);
    await updateGoal(user.id, id.data.id, parsed.data);
    revalidateGoals();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function deleteGoalAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await deleteGoal(user.id, parsed.data.id);
  revalidateGoals();
  redirect('/goals');
}

const link = z.object({ goalId: z.uuid(), projectId: z.uuid() });

export async function linkProjectAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = link.safeParse(formValues(formData));
  if (!parsed.success) return;
  await linkProject(user.id, parsed.data.goalId, parsed.data.projectId);
  revalidateGoals();
}

export async function unlinkProjectAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = link.safeParse(formValues(formData));
  if (!parsed.success) return;
  await unlinkProject(user.id, parsed.data.goalId, parsed.data.projectId);
  revalidateGoals();
}
