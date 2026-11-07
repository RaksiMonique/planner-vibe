'use server';

import { revalidatePath } from 'next/cache';
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
import { captureInput, convertCaptureInput } from './schema';
import { addCapture, convertCaptureToTask, removeCapture } from './service';

export type CaptureFormState = ActionResult<{ id: string }> | undefined;

export async function addCaptureAction(
  _prev: CaptureFormState,
  formData: FormData
): Promise<CaptureFormState> {
  try {
    const user = await requireUser();
    const parsed = captureInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const row = await addCapture(user.id, parsed.data.text);
    revalidatePath('/dashboard');
    return ok({ id: row.id });
  } catch (e) {
    return fromError(e);
  }
}

export async function removeCaptureAction(id: string): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();
    await removeCapture(user.id, id);
    revalidatePath('/dashboard');
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function convertCaptureToTaskAction(
  _prev: CaptureFormState,
  formData: FormData
): Promise<CaptureFormState> {
  try {
    const user = await requireUser();
    const parsed = convertCaptureInput.safeParse(formValues(formData));
    if (!parsed.success)
      return parsed.error.issues[0]?.path[0] === 'id'
        ? fail('Which capture?')
        : fromZodError(parsed.error);
    const prefs = await getPreferences(user.id);
    const task = await convertCaptureToTask(
      user.id,
      parsed.data.id,
      parsed.data.lifeSegmentId,
      { timeZone: prefs.timeZone, todayKey: toDateKey(todayInZone(prefs.timeZone)) },
      parsed.data.title
    );
    revalidatePath('/', 'layout');
    return ok({ id: task.id });
  } catch (e) {
    return fromError(e);
  }
}
