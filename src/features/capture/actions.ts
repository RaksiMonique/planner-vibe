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
import { captureInput, convertCaptureInput, stickyInput } from './schema';
import {
  addCapture,
  addPinnedCapture,
  convertCaptureToTask,
  removeCapture,
  setCapturePinnedDate,
} from './service';

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

const STICKY_PATHS = ['/time', '/dashboard'];

export async function addStickyAction(
  _prev: CaptureFormState,
  formData: FormData
): Promise<CaptureFormState> {
  try {
    const user = await requireUser();
    const parsed = stickyInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const row = await addPinnedCapture(user.id, parsed.data.text, parsed.data.pinnedDate);
    STICKY_PATHS.forEach((p) => revalidatePath(p));
    return ok({ id: row.id });
  } catch (e) {
    return fromError(e);
  }
}

export async function unpinCaptureAction(id: string): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();
    await setCapturePinnedDate(user.id, id, null);
    STICKY_PATHS.forEach((p) => revalidatePath(p));
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}
