'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { pushEventSoon } from '@/features/integrations/google-sync';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { captures } from '@/db/schema';
import { clearReminder, syncReminder } from '@/features/reminders/service';
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
import type { CalendarItem } from './expand';
import { eventInput, moveInput, removeCategoryInput, renameCategoryInput } from './schema';
import {
  buildCalendarItems,
  createEvent,
  getEvent,
  moveEvent,
  removeCategory,
  removeEvent,
  renameCategory,
  toFormValues,
  updateEvent,
  type EventFormValues,
} from './service';

const AFFECTED = ['/calendar', '/dashboard'];
const revalidate = () => AFFECTED.forEach((p) => revalidatePath(p));

export async function saveEvent(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const parsed = eventInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const { timeZone } = await getPreferences(user.id);
    const { id, ...input } = parsed.data;
    const row = id
      ? await updateEvent(user.id, id, parsed.data, timeZone)
      : await createEvent(user.id, { ...input }, timeZone);
    await syncReminder(
      user.id,
      'event',
      row.id,
      { reminder: parsed.data.reminder, reminderAt: parsed.data.reminderAt },
      { dueAt: row.isAllDay ? null : row.startsAt, dueDateKey: row.allDayDate, timeZone }
    );
    after(() => pushEventSoon(user.id, row.id));
    revalidate();
    return ok({ id: row.id });
  } catch (e) {
    return fromError(e);
  }
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await removeEvent(user.id, id);
    await clearReminder(user.id, 'event', id);
    after(() => pushEventSoon(user.id, id));
    revalidate();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function moveEventAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = moveInput.safeParse(input);
    if (!parsed.success) return fail('That move is not valid.');
    const moved = await moveEvent(user.id, parsed.data);
    after(() => pushEventSoon(user.id, moved.id));
    revalidate();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

/** Items for a range the client has navigated to. */
export async function getCalendarItems(
  fromISO: string,
  toISO: string
): Promise<ActionResult<CalendarItem[]>> {
  try {
    const user = await requireUser();
    const from = new Date(fromISO);
    const to = new Date(toISO);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()))
      return fail('That range is not valid.');
    return ok(await buildCalendarItems(user.id, from, to));
  } catch (e) {
    return fromError(e);
  }
}

/** Form values for editing an existing event. */
export async function loadEvent(id: string): Promise<ActionResult<EventFormValues>> {
  try {
    const user = await requireUser();
    const [{ timeZone }, row] = await Promise.all([getPreferences(user.id), getEvent(user.id, id)]);
    return ok(toFormValues(row, timeZone));
  } catch (e) {
    return fromError(e);
  }
}

/** Text of an unfiled capture, for `?capture=<id>`. */
export async function loadCaptureText(id: string): Promise<string | null> {
  const user = await requireUser();
  const [row] = await db
    .select({ text: captures.text })
    .from(captures)
    .where(and(eq(captures.userId, user.id), eq(captures.id, id)))
    .limit(1);
  return row?.text ?? null;
}

/** Settings: rename one of the user's own event categories everywhere it is used. */
export async function renameEventCategory(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = renameCategoryInput.safeParse(formValues(formData));
  if (!parsed.success) return;
  await renameCategory(user.id, parsed.data.from, parsed.data.to);
  revalidate();
  revalidatePath('/settings');
}

/** Settings: drop one of the user's own event categories; its events become General. */
export async function removeEventCategory(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = removeCategoryInput.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeCategory(user.id, parsed.data.name);
  revalidate();
  revalidatePath('/settings');
}
