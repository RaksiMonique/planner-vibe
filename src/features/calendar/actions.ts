'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { captures } from '@/db/schema';
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
import { eventInput, moveInput } from './schema';
import {
  buildCalendarItems,
  createEvent,
  getEvent,
  moveEvent,
  removeEvent,
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
    await moveEvent(user.id, parsed.data);
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
