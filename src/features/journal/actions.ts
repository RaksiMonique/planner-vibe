'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { formValues, fromError, fromZodError, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/auth';
import { gratitudeInput, journalEntryInput, quickGratitudeInput } from './schema';
import { appendGratitude, removeEntry, saveEntry, saveGratitude } from './service';

function refresh() {
  revalidatePath('/journal');
  revalidatePath('/dashboard');
}

export async function saveJournalEntryAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const values = formValues(formData);
    const parsed = journalEntryInput.safeParse(values);
    if (!parsed.success) return fromZodError(parsed.error);
    const id = typeof values.id === 'string' ? values.id : undefined;
    await saveEntry(user.id, parsed.data, id);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function saveGratitudeAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = gratitudeInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await saveGratitude(user.id, parsed.data.date, parsed.data.lines, parsed.data.lifeSegmentId);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function quickGratitudeAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = quickGratitudeInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await appendGratitude(user.id, parsed.data.date, parsed.data.content);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function deleteJournalEntryAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = z.object({ id: z.uuid() }).safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeEntry(user.id, parsed.data.id);
  refresh();
}
