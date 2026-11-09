'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { formValues, fromError, fromZodError, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/auth';
import { milestoneInput } from './schema';
import { createMilestone, removeMilestone, toggleMilestone } from './service';

function revalidateOwners() {
  revalidatePath('/goals', 'layout');
  revalidatePath('/projects', 'layout');
  revalidatePath('/segments', 'layout');
  revalidatePath('/calendar', 'layout');
  revalidatePath('/dashboard');
}

export async function createMilestoneAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = milestoneInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await createMilestone(user.id, parsed.data);
    revalidateOwners();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

const withId = z.object({ id: z.uuid() });

export async function toggleMilestoneAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await toggleMilestone(user.id, parsed.data.id);
  revalidateOwners();
}

export async function removeMilestoneAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeMilestone(user.id, parsed.data.id);
  revalidateOwners();
}
