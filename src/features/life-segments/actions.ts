'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { formValues, fromError, fromZodError, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/auth';
import { segmentInput } from './schema';
import { createSegment, setSegmentArchived, updateSegment } from './service';

function revalidateSegments() {
  revalidatePath('/segments', 'layout');
  revalidatePath('/goals', 'layout');
  revalidatePath('/projects', 'layout');
  revalidatePath('/tasks', 'layout');
  revalidatePath('/dashboard');
}

export async function createSegmentAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = segmentInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await createSegment(user.id, parsed.data);
    revalidateSegments();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

const withId = z.object({ id: z.uuid() });

export async function updateSegmentAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const values = formValues(formData);
    const id = withId.safeParse(values);
    if (!id.success) return fromZodError(id.error);
    const parsed = segmentInput.safeParse(values);
    if (!parsed.success) return fromZodError(parsed.error);
    await updateSegment(user.id, id.data.id, parsed.data);
    revalidateSegments();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

const archiveInput = z.object({ id: z.uuid(), archived: z.enum(['true', 'false']) });

export async function setSegmentArchivedAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = archiveInput.safeParse(formValues(formData));
  if (!parsed.success) return;
  await setSegmentArchived(user.id, parsed.data.id, parsed.data.archived === 'true');
  revalidateSegments();
}
