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
import {
  blockInput,
  entryInput,
  moveBlockInput,
  templateApplyInput,
  templateSaveInput,
  timerStartInput,
} from './schema';
import {
  applyTemplate,
  buildTimeRange,
  createBlock,
  createEntry,
  getBlock,
  getEntry,
  moveBlock,
  removeBlock,
  removeEntry,
  removeTemplate,
  saveTemplateFromRange,
  startTimer,
  stopTimer,
  toBlockFormValues,
  toEntryFormValues,
  updateBlock,
  updateEntry,
  type BlockFormValues,
  type EntryFormValues,
  type TimeRangeData,
} from './service';

const AFFECTED = ['/time', '/dashboard', '/week', '/calendar'];
const revalidate = () => AFFECTED.forEach((p) => revalidatePath(p));

export type SaveState = ActionResult<{ id: string }> | null;

export async function saveBlock(_prev: SaveState, formData: FormData): Promise<SaveState> {
  try {
    const user = await requireUser();
    const parsed = blockInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const { timeZone } = await getPreferences(user.id);
    const { id, ...input } = parsed.data;
    const row = id
      ? await updateBlock(user.id, id, parsed.data, timeZone)
      : await createBlock(user.id, { ...input }, timeZone);
    revalidate();
    return ok({ id: row.id });
  } catch (e) {
    return fromError(e);
  }
}

export async function deleteBlock(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await removeBlock(user.id, id);
    revalidate();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function moveBlockAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = moveBlockInput.safeParse(input);
    if (!parsed.success) return fail('That move is not valid.');
    await moveBlock(user.id, parsed.data);
    revalidate();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function loadBlock(id: string): Promise<ActionResult<BlockFormValues>> {
  try {
    const user = await requireUser();
    const [{ timeZone }, row] = await Promise.all([getPreferences(user.id), getBlock(user.id, id)]);
    return ok(toBlockFormValues(row, timeZone));
  } catch (e) {
    return fromError(e);
  }
}

/** Blocks, entries, sticky notes and analysis for a range the client navigated to. */
export async function getTimeRange(
  fromISO: string,
  toISO: string
): Promise<ActionResult<TimeRangeData>> {
  try {
    const user = await requireUser();
    const from = new Date(fromISO);
    const to = new Date(toISO);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from)
      return fail('That range is not valid.');
    const { timeZone } = await getPreferences(user.id);
    return ok(await buildTimeRange(user.id, from, to, timeZone));
  } catch (e) {
    return fromError(e);
  }
}

export async function saveEntry(_prev: SaveState, formData: FormData): Promise<SaveState> {
  try {
    const user = await requireUser();
    const parsed = entryInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const { timeZone } = await getPreferences(user.id);
    const { id, ...input } = parsed.data;
    const row = id
      ? await updateEntry(user.id, id, parsed.data, timeZone)
      : await createEntry(user.id, { ...input }, timeZone);
    revalidate();
    return ok({ id: row.id });
  } catch (e) {
    return fromError(e);
  }
}

export async function deleteEntry(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await removeEntry(user.id, id);
    revalidate();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function loadEntry(id: string): Promise<ActionResult<EntryFormValues>> {
  try {
    const user = await requireUser();
    const [{ timeZone }, row] = await Promise.all([getPreferences(user.id), getEntry(user.id, id)]);
    return ok(toEntryFormValues(row, timeZone));
  } catch (e) {
    return fromError(e);
  }
}

export async function startTimerAction(_prev: SaveState, formData: FormData): Promise<SaveState> {
  try {
    const user = await requireUser();
    const parsed = timerStartInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const row = await startTimer(user.id, parsed.data);
    revalidate();
    return ok({ id: row.id });
  } catch (e) {
    return fromError(e);
  }
}

export async function stopTimerAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const row = await stopTimer(user.id, id);
    revalidate();
    return ok({ id: row.id });
  } catch (e) {
    return fromError(e);
  }
}

export async function saveTemplateAction(_prev: SaveState, formData: FormData): Promise<SaveState> {
  try {
    const user = await requireUser();
    const parsed = templateSaveInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const prefs = await getPreferences(user.id);
    const row = await saveTemplateFromRange(
      user.id,
      parsed.data,
      prefs.timeZone,
      prefs.weekStartsOn
    );
    revalidate();
    return ok({ id: row.id });
  } catch (e) {
    return fromError(e);
  }
}

export type ApplyState = ActionResult<{ created: number }> | null;

export async function applyTemplateAction(
  _prev: ApplyState,
  formData: FormData
): Promise<ApplyState> {
  try {
    const user = await requireUser();
    const parsed = templateApplyInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const prefs = await getPreferences(user.id);
    const created = await applyTemplate(user.id, parsed.data, prefs.timeZone, prefs.weekStartsOn);
    revalidate();
    return ok({ created });
  } catch (e) {
    return fromError(e);
  }
}

export async function deleteTemplateAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await removeTemplate(user.id, id);
    revalidate();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}
