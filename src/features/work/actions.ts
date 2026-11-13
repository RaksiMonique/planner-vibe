'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { formValues, fromError, fromZodError, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/auth';
import { getPreferences } from '@/features/settings/service';
import { toDateKey, todayInZone } from '@/lib/dates';
import { holidayInput, leaveInput, patternInput, shiftInput, shiftKindInput } from './schema';
import {
  createLeave,
  createPattern,
  createShift,
  createShiftKind,
  removeHoliday,
  removeShiftKind,
  removeLeave,
  removePattern,
  removeShift,
  saveHoliday,
  setPatternActive,
  updateLeave,
  updatePattern,
  updateShift,
  updateShiftKind,
} from './service';

/** Shifts also show on the Life Calendar and the dashboard preview. */
const AFFECTED = ['/work/calendar', '/calendar', '/dashboard'];
const refresh = () => AFFECTED.forEach((p) => revalidatePath(p));
const withId = z.object({ id: z.uuid() });
type FormAction = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

function formAction<T>(
  schema: z.ZodType<T>,
  run: (userId: string, data: T, values: Record<string, unknown>) => Promise<void>
): FormAction {
  return async (_prev, formData) => {
    try {
      const user = await requireUser();
      const values = formValues(formData);
      const parsed = schema.safeParse(values);
      if (!parsed.success) return fromZodError(parsed.error);
      await run(user.id, parsed.data, values);
      refresh();
      return ok(undefined);
    } catch (e) {
      return fromError(e);
    }
  };
}

async function todayKeyFor(userId: string): Promise<string> {
  const prefs = await getPreferences(userId);
  return toDateKey(todayInZone(prefs.timeZone));
}

function idOf(values: Record<string, unknown>): string {
  const parsed = withId.safeParse(values);
  if (!parsed.success) throw new Error('Missing id.');
  return parsed.data.id;
}

export const createPatternAction = formAction(patternInput, (userId, data) =>
  createPattern(userId, data).then(() => undefined)
);
export const updatePatternAction = formAction(patternInput, (userId, data, values) =>
  updatePattern(userId, idOf(values), data)
);
export const createShiftAction = formAction(shiftInput, (userId, data) =>
  createShift(userId, data).then(() => undefined)
);
export const updateShiftAction = formAction(shiftInput, (userId, data, values) =>
  updateShift(userId, idOf(values), data)
);
export const createShiftKindAction = formAction(shiftKindInput, (userId, data) =>
  createShiftKind(userId, data).then(() => undefined)
);
export const updateShiftKindAction = formAction(shiftKindInput, (userId, data, values) =>
  updateShiftKind(userId, idOf(values), data)
);
export const createLeaveAction = formAction(leaveInput, (userId, data) =>
  createLeave(userId, data).then(() => undefined)
);
export const updateLeaveAction = formAction(leaveInput, (userId, data, values) =>
  updateLeave(userId, idOf(values), data)
);
export const saveHolidayAction = formAction(holidayInput, (userId, data) =>
  saveHoliday(userId, data).then(() => undefined)
);

export async function setPatternActiveAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.extend({ isActive: z.enum(['1', '0']) }).safeParse(formValues(formData));
  if (!parsed.success) return;
  await setPatternActive(user.id, parsed.data.id, parsed.data.isActive === '1');
  refresh();
}

export async function deletePatternAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removePattern(user.id, parsed.data.id, await todayKeyFor(user.id));
  refresh();
}

export async function deleteShiftAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeShift(user.id, parsed.data.id, await todayKeyFor(user.id));
  refresh();
}

export async function deleteShiftKindAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeShiftKind(user.id, parsed.data.id);
  refresh();
}

export async function deleteLeaveAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeLeave(user.id, parsed.data.id);
  refresh();
}

export async function deleteHolidayAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeHoliday(user.id, parsed.data.id);
  refresh();
}
