'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { formValues, fromError, fromZodError, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/auth';
import { noteInput } from './schema';
import { createNote, removeNote, setNotePinned, updateNote } from './service';

function refresh() {
  revalidatePath('/notes');
  revalidatePath('/notes/quotes');
  revalidatePath('/dashboard');
}

const withId = z.object({ id: z.uuid() });

export async function createNoteAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = noteInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await createNote(user.id, parsed.data);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function updateNoteAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const values = formValues(formData);
    const id = withId.safeParse(values);
    if (!id.success) return fromZodError(id.error);
    const parsed = noteInput.safeParse(values);
    if (!parsed.success) return fromZodError(parsed.error);
    await updateNote(user.id, id.data.id, parsed.data);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function toggleNotePinAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.extend({ pinned: z.enum(['1', '0']) }).safeParse(formValues(formData));
  if (!parsed.success) return;
  await setNotePinned(user.id, parsed.data.id, parsed.data.pinned === '1');
  refresh();
}

export async function deleteNoteAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeNote(user.id, parsed.data.id);
  refresh();
}
